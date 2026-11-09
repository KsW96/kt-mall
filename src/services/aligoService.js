const NotificationModel = require('../models/notificationModel');

const ALIGO_SEND_URL = 'https://apis.aligo.in/send/';
const ALIGO_REMAIN_URL = 'https://apis.aligo.in/remain/';

const AligoService = {
  /**
   * 문자열의 바이트 수 계산 (한글 2Byte, 영문/숫자/기호 1Byte - EUC-KR 기준)
   */
  getByteLength(str) {
    if (!str) return 0;
    let bytes = 0;
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      // 한글 및 다국어 2바이트 계산
      bytes += (code > 128) ? 2 : 1;
    }
    return bytes;
  },

  /**
   * 메시지 내용에 따라 SMS(90B 이하) 또는 LMS(90B 초과) 자동 판단
   */
  determineMsgType(content) {
    const bytes = this.getByteLength(content);
    return bytes <= 90 ? 'SMS' : 'LMS';
  },

  /**
   * 템플릿 내 치환 변수 치환 (전화번호, 일자, 금액 자동 포맷팅 지원)
   * 지원 형태: #{고객명}, {NAME}, #{단말기명}, {MODEL}, #{개통일자}, {DATE}, #{할부원금}, {PRICE}, #{개통번호}, {PHONE}
   */
  replaceVariables(templateStr, params = {}) {
    if (!templateStr) return '';
    let result = templateStr;

    const name = params.name || params.customerName || params.receiverName || '';
    let phone = params.phone || params.receiverPhone || '';
    const model = params.model || params.deviceModel || '';
    let date = params.date || params.openingDate || '';
    let principal = params.principal || params.installmentPrincipal || '';
    const plan = params.plan || '';

    // 전화번호 자동 하이픈 포맷팅
    if (phone && !phone.includes('-')) {
      const cleanP = String(phone).replace(/[^0-9]/g, '');
      if (cleanP.length === 11) phone = cleanP.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
      else if (cleanP.length === 10) phone = cleanP.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    }

    // 날짜 자동 YYYY-MM-DD 포맷팅
    if (date && !date.includes('-')) {
      const cleanD = String(date).replace(/[^0-9]/g, '');
      if (cleanD.length === 8) date = cleanD.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
    }

    // 금액 3자리 콤마 처리
    if (principal !== undefined && principal !== null && principal !== '') {
      const cleanPr = String(principal).replace(/[^0-9]/g, '');
      if (cleanPr) {
        principal = Number(cleanPr).toLocaleString('ko-KR');
      }
    }

    const replaceMap = [
      { regex: /#\{고객명\}|\{NAME\}|\{고객명\}/gi, value: name },
      { regex: /#\{개통번호\}|\{PHONE\}|\{개통번호\}/gi, value: phone },
      { regex: /#\{단말기명\}|\{MODEL\}|\{단말기명\}/gi, value: model },
      { regex: /#\{개통일자\}|\{DATE\}|\{개통일자\}/gi, value: date },
      { regex: /#\{할부원금\}|\{PRICE\}|\{할부원금\}/gi, value: principal },
      { regex: /#\{요금제\}|\{PLAN\}|\{요금제\}/gi, value: plan }
    ];

    replaceMap.forEach(item => {
      if (item.value !== undefined && item.value !== null) {
        result = result.replace(item.regex, String(item.value));
      }
    });

    return result;
  },

  /**
   * 전화번호 포맷 정제 (하이픈 및 공백 제거, 쉼표 다중 번호 지원)
   */
  cleanPhoneNumber(phone) {
    if (!phone) return '';
    if (typeof phone !== 'string') phone = String(phone);
    if (phone.includes(',')) {
      return phone.split(',')
        .map(p => p.replace(/[^0-9]/g, ''))
        .filter(Boolean)
        .join(',');
    }
    return phone.replace(/[^0-9]/g, '');
  },

  /**
   * Aligo 단일/즉시/예약 문자 발송 (Aligo 공식 sample 규격 반영)
   */
  async sendSingle({
    receiver,
    receiverName = '테스트수신자',
    title = '',
    content = '',
    templateCode = null,
    isTest = true,
    destination = '',
    rdate = '',
    rtime = '',
    testmode = null
  }) {
    const config = await NotificationModel.getAligoConfig();
    const cleanReceiver = this.cleanPhoneNumber(receiver);
    const cleanSender = this.cleanPhoneNumber(config.sender);
    const byteLength = this.getByteLength(content);
    const msgType = this.determineMsgType(content);

    // 1. 유효성 검사
    if (!cleanReceiver) {
      throw new Error('수신 번호가 올바르지 않습니다.');
    }
    if (!content || !content.trim()) {
      throw new Error('발송할 메시지 내용이 비어있습니다.');
    }

    // Aligo 계정 정보 확인
    const hasCredentials = config.apiKey && config.userId && cleanSender;

    // 만약 계정 정보가 아직 입력되지 않은 경우 안내 및 모의 처리
    if (!hasCredentials) {
      const mockResult = {
        success: false,
        isSimulated: true,
        message: 'Aligo API Key 또는 발신번호가 아직 설정되지 않았습니다. 상단 [연동 설정]에서 계정 정보를 등록해 주세요.',
        details: {
          msg_type: msgType,
          byteLength,
          receiver: cleanReceiver,
          sender: cleanSender || '미설정',
          testmode_yn: testmode !== null ? testmode : config.testmodeYn
        }
      };

      // 실패 로그 기록
      await NotificationModel.createLog({
        msg_type: msgType,
        sender_phone: cleanSender || '미설정',
        receiver_name: receiverName,
        receiver_phone: cleanReceiver,
        title: title || (msgType === 'LMS' ? '[KT몰] 안내' : '-'),
        content,
        template_code: templateCode,
        status: 'FAIL',
        status_desc: 'Aligo 연동 정보(API Key / User ID / 발신번호) 미설정',
        result_code: '-999',
        carrier: 'KT',
        is_test: isTest ? 'Y' : 'N'
      });

      return mockResult;
    }

    // 2. 실제 Aligo API 발송 파라미터 바인딩 (sms_sample 규격)
    try {
      const activeTestmode = (testmode !== null && testmode !== undefined && testmode !== '') 
        ? testmode 
        : config.testmodeYn;

      const params = new URLSearchParams();
      params.append('key', config.apiKey);
      params.append('user_id', config.userId);
      params.append('sender', cleanSender);
      params.append('receiver', cleanReceiver);
      params.append('msg', content);
      params.append('msg_type', msgType);

      // LMS/MMS 일 때 제목
      if (title && title.trim()) {
        params.append('title', title.trim().substring(0, 44));
      } else if (msgType === 'LMS') {
        params.append('title', '[KT몰] 알림');
      }

      // %고객명% 치환 파라미터 (destination: 01011112222|홍길동,01033334444|이순신)
      if (destination && destination.trim()) {
        params.append('destination', destination.trim());
      }

      // 예약 발송 파라미터 (rdate: YYYYMMDD, rtime: HHMM)
      if (rdate && rdate.trim()) {
        const cleanRdate = rdate.replace(/[^0-9]/g, '');
        if (cleanRdate.length === 8) {
          params.append('rdate', cleanRdate);
        }
      }
      if (rtime && rtime.trim()) {
        const cleanRtime = rtime.replace(/[^0-9]/g, '');
        if (cleanRtime.length >= 4) {
          params.append('rtime', cleanRtime.substring(0, 4));
        }
      }

      // testmode_yn (Y: 건수 차감 없는 테스트 모드, N: 실제 발송)
      if (activeTestmode === 'Y') {
        params.append('testmode_yn', 'Y');
      }

      const response = await fetch(ALIGO_SEND_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        body: params.toString()
      });

      const responseText = await response.text();
      let aligoRes;
      try {
        aligoRes = JSON.parse(responseText);
      } catch (parseErr) {
        throw new Error('Aligo 응답 JSON 파싱 실패: ' + responseText);
      }

      // Aligo 성공 규격: result_code === "1" 또는 1
      const isSuccess = String(aligoRes.result_code) === '1';
      let statusDesc = isSuccess 
        ? (config.testmodeYn === 'Y' ? '테스트모드 발송 성공 (건수 미차감)' : '정상 발송 완료')
        : (aligoRes.message || '발송 실패');

      if (!isSuccess && aligoRes.message && aligoRes.message.includes('IP')) {
        statusDesc = '알리고 IP 인증 오류: 알리고 관리자(smartsms.aligo.in) > API 연동관리에서 현재 서버 IP를 등록해 주세요. (' + aligoRes.message + ')';
      }

      // 3. DB sms_log 테이블에 이력 기록
      const logResult = await NotificationModel.createLog({
        msg_type: aligoRes.msg_type || msgType,
        sender_phone: cleanSender,
        receiver_name: receiverName,
        receiver_phone: cleanReceiver,
        title: title || (msgType === 'LMS' ? '[KT몰] 알림' : '-'),
        content,
        template_code: templateCode,
        status: isSuccess ? 'SUCCESS' : 'FAIL',
        status_desc: statusDesc,
        result_code: String(aligoRes.result_code),
        msg_id: aligoRes.msg_id ? String(aligoRes.msg_id) : null,
        carrier: 'KT',
        is_test: isTest ? 'Y' : 'N'
      });

      return {
        success: isSuccess,
        result_code: aligoRes.result_code,
        message: statusDesc,
        raw_message: aligoRes.message,
        msg_id: aligoRes.msg_id,
        success_cnt: aligoRes.success_cnt,
        error_cnt: aligoRes.error_cnt,
        msg_type: aligoRes.msg_type || msgType,
        byteLength,
        testmode: config.testmodeYn === 'Y',
        log_id: logResult ? logResult.log_id : null
      };
    } catch (netErr) {
      // 통신 에러 시 로그 기록
      await NotificationModel.createLog({
        msg_type: msgType,
        sender_phone: cleanSender,
        receiver_name: receiverName,
        receiver_phone: cleanReceiver,
        title: title || '-',
        content,
        template_code: templateCode,
        status: 'FAIL',
        status_desc: 'Aligo API 통신 에러: ' + netErr.message,
        result_code: '-500',
        carrier: 'KT',
        is_test: isTest ? 'Y' : 'N'
      });

      throw netErr;
    }
  },

  /**
   * 기간/스케줄 예약 또는 대량 발송
   */
  async sendBulk({
    receiverList = [],
    title = '',
    templateContent = '',
    templateCode = null,
    rdate = '',
    rtime = ''
  }) {
    if (!receiverList || receiverList.length === 0) {
      throw new Error('발송할 수신자 목록이 비어있습니다.');
    }

    const config = await NotificationModel.getAligoConfig();
    const cleanSender = this.cleanPhoneNumber(config.sender);

    let successCount = 0;
    let failCount = 0;
    const results = [];

    // 개별 발송 순차/청크 처리 (네트워크 부하 분산)
    for (const target of receiverList) {
      const replacedContent = this.replaceVariables(templateContent, {
        name: target.name || target.nm || '',
        phone: target.phone || '',
        model: target.model || target.model_name || '',
        date: target.date || target.opening_dt || '',
        principal: target.principal || target.installment_principal || ''
      });

      try {
        const res = await this.sendSingle({
          receiver: target.phone,
          receiverName: target.name || target.nm || '고객',
          title,
          content: replacedContent,
          templateCode,
          isTest: false
        });

        if (res.success) successCount++;
        else failCount++;
        results.push({ phone: target.phone, success: res.success, msg: res.message });
      } catch (err) {
        failCount++;
        results.push({ phone: target.phone, success: false, msg: err.message });
      }
    }

    return {
      total: receiverList.length,
      successCount,
      failCount,
      results
    };
  },

  /**
   * Aligo 잔여 건수 확인 API (Remain)
   */
  async getRemain() {
    const config = await NotificationModel.getAligoConfig();
    if (!config.apiKey || !config.userId) {
      return {
        configured: false,
        message: 'Aligo API 연동 정보가 설정되지 않았습니다.',
        SMS_CNT: 0,
        LMS_CNT: 0,
        MMS_CNT: 0
      };
    }

    try {
      const params = new URLSearchParams();
      params.append('key', config.apiKey);
      params.append('user_id', config.userId);

      const response = await fetch(ALIGO_REMAIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });

      const data = await response.json();
      return {
        configured: true,
        result_code: data.result_code,
        message: data.message,
        SMS_CNT: data.SMS_CNT || 0,
        LMS_CNT: data.LMS_CNT || 0,
        MMS_CNT: data.MMS_CNT || 0
      };
    } catch (err) {
      return {
        configured: true,
        error: true,
        message: '잔여 건수 조회 통신 에러: ' + err.message,
        SMS_CNT: 0,
        LMS_CNT: 0,
        MMS_CNT: 0
      };
    }
  }
};

module.exports = AligoService;

