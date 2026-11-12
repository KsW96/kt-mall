const db = require('../config/db');
const NotificationModel = require('../models/notificationModel');
const AligoService = require('../services/aligoService');

// 인메모리 샘플 템플릿 데이터셋 (화면 구성용)
const mockSmsTemplates = [
  {
    id: 1,
    template_code: 'SMS_OPEN_WELCOME',
    template_name: '개통 당일 가입 감사 인사',
    msg_type: 'LMS',
    condition_type: 'D_DAY',
    condition_days: 0,
    condition_desc: '개통일 기준 D-Day (당일 즉시)',
    send_cycle: 'REALTIME',
    send_cycle_desc: '실시간 즉시 발송',
    send_time: '즉시',
    target_category: '전체 (신규/기변/번이)',
    title: '[KT몰] 개통을 진심으로 축하드립니다',
    content: '[KT몰] #{고객명}님, 개통이 정상 완료되었습니다.\n\n- 고객명: #{고객명}\n- 단말기명: #{단말기명}\n- 개통일자: #{개통일자}\n- 개통번호: #{개통번호}\n- 최종할부원금: #{할부원금}원\n\n초기 불량 교환은 14일 이내 가능하며, 문의사항은 고객센터(1588-0000)로 연락 주시기 바랍니다.\n이용해 주셔서 대단히 감사합니다.',
    variables: ['#{고객명}', '#{단말기명}', '#{개통일자}', '#{개통번호}', '#{할부원금}'],
    use_yn: 'Y',
    updated_at: '2026-11-05 14:20:00'
  },
  {
    id: 2,
    template_code: 'SMS_CARE_D3',
    template_name: '개통 3일차 안심 케어 및 통화품질 점검',
    msg_type: 'SMS',
    condition_type: 'AFTER_D',
    condition_days: 3,
    condition_desc: '개통일 기준 D+3일',
    send_cycle: 'DAILY',
    send_cycle_desc: '매일 정기 발송',
    send_time: '10:30',
    target_category: '전체',
    title: '',
    content: '[KT몰] #{고객명}님, 새 단말기(#{단말기명}) 사용에 불편한 점은 없으신가요? 개통 3일차 안심 케어 센터: 1588-0000',
    variables: ['#{고객명}', '#{단말기명}'],
    use_yn: 'Y',
    updated_at: '2026-11-04 11:15:00'
  },
  {
    id: 3,
    template_code: 'SMS_PLAN_D100',
    template_name: '개통 100일차 요금제 및 부가서비스 변경 안내',
    msg_type: 'LMS',
    condition_type: 'AFTER_D',
    condition_days: 100,
    condition_desc: '개통일 기준 D+100일',
    send_cycle: 'DAILY',
    send_cycle_desc: '매일 정기 발송',
    send_time: '11:00',
    target_category: '기기변경, 번호이동',
    title: '[KT몰] 요금제 자유 변경 기간 안내',
    content: '[KT몰] #{고객명}님 안녕하세요.\n개통 100일이 경과하여 개통 시 가입하신 의무 요금제 및 유료 부가서비스를 위약금 없이 자유롭게 변경하실 수 있습니다.\n\n▶ 추천 맞춤 요금제 확인: m.kt.com/plan\n▶ 고객 지원 센터: 1588-0000',
    variables: ['#{고객명}'],
    use_yn: 'Y',
    updated_at: '2026-11-02 09:30:00'
  },
  {
    id: 4,
    template_code: 'SMS_EXPIRE_D30',
    template_name: '약정 만료 30일 전 기변 우대 혜택 안내',
    msg_type: 'LMS',
    condition_type: 'BEFORE_D',
    condition_days: 30,
    condition_desc: '약정 24개월 만료 D-30일',
    send_cycle: 'WEEKLY',
    send_cycle_desc: '매주 월요일 정기 발송',
    send_time: '14:00',
    target_category: '전체',
    title: '[KT몰] 약정 만료 사전 안내 및 VIP 특별 혜택',
    content: '[KT몰] #{고객명}님, 현재 이용 중이신 단말기(#{단말기명})의 약정이 약 30일 후 만료 예정입니다.\n\n재약정 및 최신 단말기 기기변경 시 VIP 회원 전용 추가 지원금 혜택을 제공해 드립니다.\n- 전담 상담원 직통: 1588-0000',
    variables: ['#{고객명}', '#{단말기명}'],
    use_yn: 'N',
    updated_at: '2026-10-28 16:45:00'
  }
];

const mockAlimtalkTemplates = [
  {
    id: 1,
    template_code: 'KAT_OPEN_CONFIRM',
    template_name: '[알림톡] 개통 완료 및 계약 상세 안내',
    kakao_code: 'KT_ALIM_2026_01',
    kakao_status: '승인완료',
    condition_type: 'D_DAY',
    condition_days: 0,
    condition_desc: '개통일 기준 D-Day (당일 즉시)',
    send_cycle: 'REALTIME',
    send_cycle_desc: '실시간 즉시 발송',
    send_time: '즉시',
    target_category: '전체',
    title: 'KT 개통 완료 안내',
    content: '#{고객명} 고객님, KT몰에서 개통이 성공적으로 완료되었습니다.\n\n■ 개통 상세 내역\n- 고객명: #{고객명}\n- 개통번호: #{개통번호}\n- 단말기명: #{단말기명}\n- 개통일시: #{개통일자}\n- 최종할부원금: #{할부원금}원\n\n자세한 전자계약서는 아래 버튼을 통해 확인하실 수 있습니다.',
    buttons: [
      { name: '전자계약서 조회', type: 'WL', url: 'https://m.kt.com' },
      { name: '고객센터 연결', type: 'AL', url: 'ktmall://cs' }
    ],
    variables: ['#{고객명}', '#{개통번호}', '#{단말기명}', '#{개통일자}', '#{할부원금}'],
    use_yn: 'Y',
    updated_at: '2026-11-06 10:00:00'
  },
  {
    id: 2,
    template_code: 'KAT_FIRST_BILL',
    template_name: '[알림톡] 첫 달 청구 요금 및 지원금 안내',
    kakao_code: 'KT_ALIM_2026_02',
    kakao_status: '승인완료',
    condition_type: 'AFTER_D',
    condition_days: 30,
    condition_desc: '개통일 기준 D+30일',
    send_cycle: 'MONTHLY',
    send_cycle_desc: '매월 특정일 (15일)',
    send_time: '10:00',
    target_category: '전체',
    title: '첫 달 청구 요금 안내',
    content: '#{고객명} 고객님, 개통 첫 달 청구 요금 안내드립니다.\n\n개통 시 약정된 공시지원금 혜택이 정상 반영되었으며, 실 청구 요금 및 납부 내역을 간편하게 확인해 보세요.',
    buttons: [
      { name: '실시간 요금 조회', type: 'WL', url: 'https://m.kt.com/bill' }
    ],
    variables: ['#{고객명}'],
    use_yn: 'Y',
    updated_at: '2026-11-03 15:20:00'
  },
  {
    id: 3,
    template_code: 'KAT_SERVICE_CHECK',
    template_name: '[알림톡] 개통 6개월 무상 점검 쿠폰',
    kakao_code: 'KT_ALIM_2026_05',
    kakao_status: '승인완료',
    condition_type: 'AFTER_D',
    condition_days: 180,
    condition_desc: '개통일 기준 D+180일',
    send_cycle: 'WEEKLY',
    send_cycle_desc: '매주 수요일 정기 발송',
    send_time: '14:00',
    target_category: '전체',
    title: '단말기 케어 점검 쿠폰',
    content: '#{고객명} 고객님, 개통 6개월 기념 안심 점검 서비스!\n가까운 KT 공식 서비스 센터 방문 시 단말기 무상 클리닝 및 배터리 점검을 받으실 수 있는 모바일 쿠폰이 발송되었습니다.',
    buttons: [
      { name: '모바일 쿠폰 확인', type: 'WL', url: 'https://m.kt.com/coupon' },
      { name: '가까운 센터 찾기', type: 'WL', url: 'https://m.kt.com/center' }
    ],
    variables: ['#{고객명}'],
    use_yn: 'Y',
    updated_at: '2026-10-30 11:10:00'
  }
];

// 인메모리 샘플 발송 이력 데이터셋 (조회 폼 및 화면 구성용 - 통신사 비할당 안전 가상번호 010-0000-xxxx 적용)
const mockHistoryList = [
  {
    id: 101,
    msg_type: 'ALIMTALK',
    channel_name: '카카오 알림톡',
    receiver_name: '홍길동',
    receiver_phone: '010-0000-0001',
    title: '[KT몰] 개통 완료 알림',
    content: '홍길동 고객님, KT 공식몰에서 개통이 성공적으로 완료되었습니다.\n\n■ 개통 상세 내역\n- 고객명: 홍길동\n- 개통번호: 010-0000-0001\n- 단말기명: 갤럭시 S25 Ultra\n- 개통일자: 2026-11-06\n- 할부원금: 850,000원\n\n이용해 주셔서 감사합니다.',
    sent_dt: '2026-11-06 10:15:32',
    status: 'SUCCESS',
    status_desc: '발송 성공 (안전 시뮬레이션)',
    result_code: '200 (성공)',
    carrier: 'KT',
    template_code: 'KAKAO_OPEN_WELCOME'
  },
  {
    id: 102,
    msg_type: 'SMS',
    channel_name: '문자 (SMS)',
    receiver_name: '김영희',
    receiver_phone: '010-0000-0003',
    title: '-',
    content: '[KT몰] 김영희님, 새 단말기(갤럭시 Z플립6) 개통 3일차 안심 케어 센터: 1588-0000',
    sent_dt: '2026-11-06 10:30:10',
    status: 'SUCCESS',
    status_desc: '발송 성공 (안전 시뮬레이션)',
    result_code: '1000 (성공)',
    carrier: 'SKT',
    template_code: 'SMS_CARE_D3'
  },
  {
    id: 103,
    msg_type: 'LMS',
    channel_name: '문자 (LMS)',
    receiver_name: '이철수',
    receiver_phone: '010-0000-0007',
    title: '[KT몰] 요금제 자유 변경 기간 안내',
    content: '[KT몰] 이철수님 안녕하세요.\n개통 100일이 경과하여 개통 시 가입하신 의무 요금제 및 유료 부가서비스를 위약금 없이 자유롭게 변경하실 수 있습니다.\n\n▶ 추천 맞춤 요금제: m.kt.com/plan\n▶ 문의: 1588-0000',
    sent_dt: '2026-11-06 11:00:05',
    status: 'SUCCESS',
    status_desc: '발송 성공 (안전 시뮬레이션)',
    result_code: '1000 (성공)',
    carrier: 'LGU+',
    template_code: 'SMS_PLAN_D100'
  },
  {
    id: 104,
    msg_type: 'ALIMTALK',
    channel_name: '카카오 알림톡',
    receiver_name: '박민수',
    receiver_phone: '010-0000-0004',
    title: '[KT몰] 개통 1년차 단말기/배터리 점검 안내',
    content: '박민수 고객님, 단말기 개통 1년 기념 배터리 및 외관 무상 점검 쿠폰이 발급되었습니다.',
    sent_dt: '2026-11-06 11:30:00',
    status: 'FAIL',
    status_desc: '발송 실패',
    result_code: '3008 (카카오톡 미설치 또는 알림톡 수신 차단)',
    carrier: 'KT',
    template_code: 'KAKAO_CARE_1Y'
  },
  {
    id: 105,
    msg_type: 'LMS',
    channel_name: '문자 (LMS)',
    receiver_name: '정수진',
    receiver_phone: '010-0000-0005',
    title: '[KT몰] 24개월 약정 만료 사전 안내',
    content: '[KT몰] 정수진 고객님, 다음 달 24개월 선택약정이 만료됩니다. 재약정 요금 25% 할인 또는 기기변경 특별 지원금을 확인해 보세요.',
    sent_dt: '2026-11-05 14:00:21',
    status: 'SUCCESS',
    status_desc: '발송 성공 (안전 시뮬레이션)',
    result_code: '1000 (성공)',
    carrier: 'KT',
    template_code: 'SMS_EXPIRE_D30'
  },
  {
    id: 106,
    msg_type: 'SMS',
    channel_name: '문자 (SMS)',
    receiver_name: '최동욱',
    receiver_phone: '010-0000-0006',
    title: '-',
    content: '[KT몰] 최동욱님, 새 단말기(iPhone 16 Pro) 사용에 불편한 점은 없으신가요? 고객센터: 1588-0000',
    sent_dt: '2026-11-05 10:30:12',
    status: 'SUCCESS',
    status_desc: '발송 성공 (안전 시뮬레이션)',
    result_code: '1000 (성공)',
    carrier: 'SKT',
    template_code: 'SMS_CARE_D3'
  },
  {
    id: 107,
    msg_type: 'ALIMTALK',
    channel_name: '카카오 알림톡',
    receiver_name: '강지훈',
    receiver_phone: '010-0000-0009',
    title: '[KT몰] 포인트 소멸 예정 안내',
    content: '강지훈 고객님, 보유 중이신 KT몰 포인트 5,000P가 이달 말 소멸 예정입니다. KT몰 앱에서 사은품으로 교환하세요.',
    sent_dt: '2026-11-05 09:30:45',
    status: 'SUCCESS',
    status_desc: '발송 성공 (안전 시뮬레이션)',
    result_code: '200 (성공)',
    carrier: 'KT',
    template_code: 'KAKAO_POINT_EXP'
  },
  {
    id: 108,
    msg_type: 'SMS',
    channel_name: '문자 (SMS)',
    receiver_name: '한미소',
    receiver_phone: '010-0000-0010',
    title: '-',
    content: '[KT몰] 한미소님 개통을 축하드립니다. 고객센터: 1588-0000',
    sent_dt: '2026-11-04 18:20:10',
    status: 'FAIL',
    status_desc: '발송 실패',
    result_code: '2001 (수신 번호 일시 결번/착신 정지)',
    carrier: 'LGU+',
    template_code: 'SMS_OPEN_WELCOME'
  }
];

const notificationController = {
  /**
   * 문자(SMS/LMS) 관리 화면 렌더링
   */
  async renderSmsPage(req, res) {
    try {
      const templates = await NotificationModel.getTemplates();
      const aligoConfig = await NotificationModel.getAligoConfig();
      const historyStats = await NotificationModel.getHistoryStats();
      const remainInfo = await AligoService.getRemain();
      // 개통일 기준 183일 이상 경과 고객 기본 타겟 리스트 조회
      const initialRecipientsResult = await NotificationModel.getTargetRecipients({
        condition: 'AFTER_183D',
        days: 183,
        limit: 100
      });

      res.render('notificationSms', {
        title: '문자 관리 (SMS/LMS)',
        activeMenu: 'notification-sms',
        templates,
        aligoConfig,
        remainInfo,
        initialRecipients: initialRecipientsResult.items || [],
        targetCount: initialRecipientsResult.total || 0,
        stats: {
          totalTemplates: templates.length,
          activeTemplates: templates.filter(t => t.use_yn === 'Y').length,
          monthlySent: historyStats.totalCount || 0,
          successRate: historyStats.successRate || '100.0%'
        },
        dbStatus: db.getDbStatus()
      });
    } catch (err) {
      console.error('renderSmsPage error:', err);
      res.render('notificationSms', {
        title: '문자 관리 (SMS/LMS)',
        activeMenu: 'notification-sms',
        templates: mockSmsTemplates,
        aligoConfig: { apiKey: '', userId: '', sender: '', testmodeYn: 'Y' },
        remainInfo: { configured: false, SMS_CNT: 0, LMS_CNT: 0, MMS_CNT: 0 },
        initialRecipients: [],
        targetCount: 0,
        stats: { totalTemplates: 4, activeTemplates: 4, monthlySent: 0, successRate: '100%' },
        dbStatus: db.getDbStatus()
      });
    }
  },

  /**
   * 알림톡(카카오) 관리 화면 렌더링
   */
  async renderAlimtalkPage(req, res) {
    res.render('notificationAlimtalk', {
      title: '알림톡 관리 (카카오)',
      activeMenu: 'notification-alimtalk',
      templates: mockAlimtalkTemplates,
      stats: {
        totalTemplates: mockAlimtalkTemplates.length,
        activeTemplates: mockAlimtalkTemplates.filter(t => t.use_yn === 'Y').length,
        monthlySent: 3512,
        successRate: '99.8%'
      },
      dbStatus: db.getDbStatus()
    });
  },

  /**
   * 메세지 발송 이력 조회 화면 렌더링 (실제 sms_log DB 연동)
   */
  async renderHistoryPage(req, res) {
    const { startDate = '', endDate = '', msgType = '', status = '', keyword = '', page = 1 } = req.query;

    try {
      const historyResult = await NotificationModel.getHistoryList({
        page: parseInt(page, 10) || 1,
        limit: 20,
        startDate,
        endDate,
        msgType,
        status,
        keyword
      });

      const stats = await NotificationModel.getHistoryStats();

      res.render('notificationHistory', {
        title: '메세지 발송 이력',
        activeMenu: 'notification-history',
        historyList: historyResult.items || [],
        pagination: {
          page: historyResult.page,
          totalPages: historyResult.totalPages,
          total: historyResult.total,
          limit: historyResult.limit
        },
        filters: { startDate, endDate, msgType, status, keyword },
        stats,
        dbStatus: db.getDbStatus()
      });
    } catch (err) {
      console.error('renderHistoryPage error:', err);
      res.render('notificationHistory', {
        title: '메세지 발송 이력',
        activeMenu: 'notification-history',
        historyList: mockHistoryList,
        pagination: { page: 1, totalPages: 1, total: mockHistoryList.length, limit: 20 },
        filters: { startDate, endDate, msgType, status, keyword },
        stats: { totalCount: mockHistoryList.length, todayCount: 0, successCount: mockHistoryList.length, failCount: 0, successRate: '100%' },
        dbStatus: db.getDbStatus()
      });
    }
  },

  /**
   * API: 단일 테스트 문자 즉시 발송
   */
  async sendTestSms(req, res) {
    try {
      const { receiver, receiverName, title, content, templateCode, destination, rdate, rtime, testmode } = req.body;

      if (!receiver) {
        return res.status(400).json({ success: false, message: '수신 번호는 필수 입력입니다.' });
      }
      if (!content) {
        return res.status(400).json({ success: false, message: '문자 메시지 본문은 필수 입력입니다.' });
      }

      const result = await AligoService.sendSingle({
        receiver,
        receiverName: receiverName || '테스트수신자',
        title,
        content,
        templateCode,
        isTest: true,
        destination,
        rdate,
        rtime,
        testmode
      });

      return res.json(result);
    } catch (err) {
      console.error('sendTestSms error:', err);
      return res.status(500).json({
        success: false,
        message: '문자 발송 처리 중 오류가 발생했습니다: ' + err.message
      });
    }
  },

  /**
   * API: 템플릿 저장 (신규 등록 및 수정)
   */
  async saveTemplate(req, res) {
    try {
      const result = await NotificationModel.saveTemplate(req.body);
      return res.json({ success: true, message: '템플릿이 성공적으로 저장되었습니다.', ...result });
    } catch (err) {
      console.error('saveTemplate error:', err);
      return res.status(500).json({ success: false, message: '템플릿 저장 중 오류: ' + err.message });
    }
  },

  /**
   * API: 템플릿 상태(USE/HIDE) 토글
   */
  async toggleTemplateStatus(req, res) {
    try {
      const { id } = req.params;
      const result = await NotificationModel.toggleTemplateStatus(id);
      return res.json({ success: true, message: `템플릿 상태가 ${result.use_yn === 'Y' ? '활성(USE)' : '중지(HIDE)'}(으)로 변경되었습니다.`, ...result });
    } catch (err) {
      console.error('toggleTemplateStatus error:', err);
      return res.status(500).json({ success: false, message: '상태 변경 중 오류: ' + err.message });
    }
  },

  /**
   * API: 템플릿 삭제
   */
  async deleteTemplate(req, res) {
    try {
      const { id } = req.params;
      await NotificationModel.deleteTemplate(id);
      return res.json({ success: true, message: '템플릿이 삭제되었습니다.' });
    } catch (err) {
      console.error('deleteTemplate error:', err);
      return res.status(500).json({ success: false, message: '템플릿 삭제 중 오류: ' + err.message });
    }
  },

  /**
   * API: 기간/대량 발송
   */
  async sendBulkSms(req, res) {
    try {
      const { receiverList, title, templateContent, templateCode, rdate, rtime, testmode } = req.body;

      if (!receiverList || !Array.isArray(receiverList) || receiverList.length === 0) {
        return res.status(400).json({ success: false, message: '발송할 수신자 목록이 비어있습니다.' });
      }

      const result = await AligoService.sendBulk({
        receiverList,
        title,
        templateContent,
        templateCode,
        rdate,
        rtime,
        testmode
      });

      return res.json({ success: true, ...result });
    } catch (err) {
      console.error('sendBulkSms error:', err);
      return res.status(500).json({ success: false, message: '대량 발송 처리 중 오류 발생: ' + err.message });
    }
  },

  /**
   * API: Aligo 연동 설정 저장
   */
  async saveConfig(req, res) {
    try {
      const { apiKey, userId, sender, testmodeYn } = req.body;
      await NotificationModel.saveAligoConfig({ apiKey, userId, sender, testmodeYn });
      return res.json({ success: true, message: 'Aligo 연동 설정이 성공적으로 저장되었습니다.' });
    } catch (err) {
      console.error('saveConfig error:', err);
      return res.status(500).json({ success: false, message: '설정 저장 중 오류: ' + err.message });
    }
  },

  /**
   * API: Aligo 실시간 잔여 건수 조회
   */
  async getRemain(req, res) {
    try {
      const remain = await AligoService.getRemain();
      return res.json(remain);
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
   * API: 개통일 및 조건 기준 단체 발송 대상 고객 목록 조회
   */
  async getTargetRecipients(req, res) {
    try {
      const { condition = 'AFTER_183D', days = 183, keyword = '', limit = 100 } = req.query;
      const result = await NotificationModel.getTargetRecipients({
        condition,
        days: parseInt(days, 10) || 183,
        keyword,
        limit: parseInt(limit, 10) || 100
      });
      return res.json({
        success: true,
        ...result
      });
    } catch (err) {
      console.error('getTargetRecipients error:', err);
      return res.status(500).json({ success: false, message: '발송 대상 고객 조회 중 오류: ' + err.message });
    }
  }
};

module.exports = notificationController;

