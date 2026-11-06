const db = require('../config/db');

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
    title: '[KT 마켓] 개통을 진심으로 축하드립니다',
    content: '[KT 마켓] #{고객명}님, 개통이 정상 완료되었습니다.\n\n- 고객명: #{고객명}\n- 단말기명: #{단말기명}\n- 개통일자: #{개통일자}\n- 개통번호: #{개통번호}\n- 최종할부원금: #{할부원금}원\n\n초기 불량 교환은 14일 이내 가능하며, 문의사항은 고객센터(1588-0000)로 연락 주시기 바랍니다.\n이용해 주셔서 대단히 감사합니다.',
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
    content: '[KT 마켓] #{고객명}님, 새 단말기(#{단말기명}) 사용에 불편한 점은 없으신가요? 개통 3일차 안심 케어 센터: 1588-0000',
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
    title: '[KT 마켓] 요금제 자유 변경 기간 안내',
    content: '[KT 마켓] #{고객명}님 안녕하세요.\n개통 100일이 경과하여 개통 시 가입하신 의무 요금제 및 유료 부가서비스를 위약금 없이 자유롭게 변경하실 수 있습니다.\n\n▶ 추천 맞춤 요금제 확인: m.kt.com/plan\n▶ 고객 지원 센터: 1588-0000',
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
    title: '[KT 마켓] 약정 만료 사전 안내 및 VIP 특별 혜택',
    content: '[KT 마켓] #{고객명}님, 현재 이용 중이신 단말기(#{단말기명})의 약정이 약 30일 후 만료 예정입니다.\n\n재약정 및 최신 단말기 기기변경 시 VIP 회원 전용 추가 지원금 혜택을 제공해 드립니다.\n- 전담 상담원 직통: 1588-0000',
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
    content: '#{고객명} 고객님, KT 공식 마켓에서 개통이 성공적으로 완료되었습니다.\n\n■ 개통 상세 내역\n- 고객명: #{고객명}\n- 개통번호: #{개통번호}\n- 단말기명: #{단말기명}\n- 개통일시: #{개통일자}\n- 최종할부원금: #{할부원금}원\n\n자세한 전자계약서는 아래 버튼을 통해 확인하실 수 있습니다.',
    buttons: [
      { name: '전자계약서 조회', type: 'WL', url: 'https://m.kt.com' },
      { name: '고객센터 연결', type: 'AL', url: 'ktmarket://cs' }
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

const notificationController = {
  /**
   * 문자(SMS/LMS) 관리 화면 렌더링
   */
  async renderSmsPage(req, res) {
    res.render('notificationSms', {
      title: '문자 관리 (SMS/LMS)',
      activeMenu: 'notification-sms',
      templates: mockSmsTemplates,
      stats: {
        totalTemplates: mockSmsTemplates.length,
        activeTemplates: mockSmsTemplates.filter(t => t.use_yn === 'Y').length,
        monthlySent: 1248,
        successRate: '99.4%'
      },
      dbStatus: db.getDbStatus()
    });
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
  }
};

module.exports = notificationController;

