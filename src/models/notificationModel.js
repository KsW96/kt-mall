const db = require('../config/db');

// 인메모리 Fallback 템플릿 목록 (DB 미연결 시)
let mockSmsTemplates = [
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
    updated_at: '2026-11-06 10:00:00'
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
    updated_at: '2026-11-06 10:00:00'
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
    updated_at: '2026-11-06 10:00:00'
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
    use_yn: 'Y',
    updated_at: '2026-11-06 10:00:00'
  }
];

// 개통일 기준 타겟팅 샘플 고객 목록 (183일 이상 경과 고객 기본 예시 포함 - 통신사 비할당 안전 가상번호 010-0000-xxxx 적용)
const mockTargetRecipients = [
  {
    id: 1001,
    cust_nm: '정미영',
    phone_num: '010-0000-0001',
    opening_dt: '2026-04-12',
    elapsed_days: 211,
    model_nm: '갤럭시 S25 Ultra 512GB',
    plan_nm: '5G 초이스 프리미엄',
    installment_principal: 650000,
    join_category: '기기변경',
    agency_cd: 'AG-KT-102',
    memo: '개통 6개월차 의무요금제 만료 대상자'
  },
  {
    id: 1002,
    cust_nm: '김태호',
    phone_num: '010-0000-0002',
    opening_dt: '2026-04-20',
    elapsed_days: 203,
    model_nm: 'iPhone 16 Pro 256GB',
    plan_nm: '5G 스페셜',
    installment_principal: 820000,
    join_category: '번호이동',
    agency_cd: 'AG-KT-105',
    memo: '선택약정 유지 중'
  },
  {
    id: 1003,
    cust_nm: '이영희',
    phone_num: '010-0000-0003',
    opening_dt: '2026-05-02',
    elapsed_days: 191,
    model_nm: '갤럭시 Z플립6 256GB',
    plan_nm: '5G 베이직',
    installment_principal: 450000,
    join_category: '신규가입',
    agency_cd: 'AG-KT-101',
    memo: '부가서비스 해지 가능 시점'
  },
  {
    id: 1004,
    cust_nm: '박지훈',
    phone_num: '010-0000-0004',
    opening_dt: '2026-03-15',
    elapsed_days: 239,
    model_nm: '갤럭시 S24 Plus',
    plan_nm: '5G 슬림',
    installment_principal: 380000,
    join_category: '기기변경',
    agency_cd: 'AG-KT-103',
    memo: '우수고객 단말기 케어'
  },
  {
    id: 1005,
    cust_nm: '최수진',
    phone_num: '010-0000-0005',
    opening_dt: '2026-04-05',
    elapsed_days: 218,
    model_nm: 'iPhone 15 128GB',
    plan_nm: 'LTE 데이터 ON 비디오',
    installment_principal: 290000,
    join_category: '번호이동',
    agency_cd: 'AG-KT-108',
    memo: '의무기간 경과 알림'
  },
  {
    id: 1006,
    cust_nm: '강민우',
    phone_num: '010-0000-0006',
    opening_dt: '2026-05-08',
    elapsed_days: 185,
    model_nm: '갤럭시 A35 5G',
    plan_nm: '5G 세이브',
    installment_principal: 150000,
    join_category: '신규가입',
    agency_cd: 'AG-KT-102',
    memo: '183일 의무요금 만료'
  },
  {
    id: 1007,
    cust_nm: '윤서아',
    phone_num: '010-0000-0007',
    opening_dt: '2026-03-28',
    elapsed_days: 226,
    model_nm: '갤럭시 S25 256GB',
    plan_nm: '5G 스페셜',
    installment_principal: 590000,
    join_category: '기기변경',
    agency_cd: 'AG-KT-104',
    memo: '가족결합 할인 적용 고객'
  },
  {
    id: 1008,
    cust_nm: '한상철',
    phone_num: '010-0000-0008',
    opening_dt: '2026-04-18',
    elapsed_days: 205,
    model_nm: 'iPhone 16 Plus 128GB',
    plan_nm: '5G 프리미엄',
    installment_principal: 740000,
    join_category: '번호이동',
    agency_cd: 'AG-KT-106',
    memo: '요금제 자유변경 권한 부여'
  },
  {
    id: 1009,
    cust_nm: '오지은',
    phone_num: '010-0000-0009',
    opening_dt: '2026-05-05',
    elapsed_days: 188,
    model_nm: '갤럭시 Z폴드6 512GB',
    plan_nm: '5G 슈퍼플랜 베이직',
    installment_principal: 1120000,
    join_category: '기기변경',
    agency_cd: 'AG-KT-101',
    memo: 'VIP 프리미엄 케어'
  },
  {
    id: 1010,
    cust_nm: '배현우',
    phone_num: '010-0000-0010',
    opening_dt: '2026-02-14',
    elapsed_days: 268,
    model_nm: '갤럭시 S24 Ultra',
    plan_nm: '5G 프리미엄',
    installment_principal: 720000,
    join_category: '신규가입',
    agency_cd: 'AG-KT-105',
    memo: '장기 유지 우수 고객'
  },
  {
    id: 1011,
    cust_nm: '신예진',
    phone_num: '010-0000-0011',
    opening_dt: '2026-04-25',
    elapsed_days: 198,
    model_nm: 'iPhone 16 128GB',
    plan_nm: '5G 심플 110GB',
    installment_principal: 610000,
    join_category: '번호이동',
    agency_cd: 'AG-KT-107',
    memo: '개통 183일 경과'
  },
  {
    id: 1012,
    cust_nm: '임도윤',
    phone_num: '010-0000-0012',
    opening_dt: '2026-05-09',
    elapsed_days: 184,
    model_nm: '갤럭시 S25 256GB',
    plan_nm: '5G 스페셜',
    installment_principal: 580000,
    join_category: '기기변경',
    agency_cd: 'AG-KT-102',
    memo: '183일 경과 기준 충족'
  }
];

// 인메모리 Fallback 발송 이력 목록 (DB 미연결 시)
let mockSmsLogs = [
  {
    id: 1,
    msg_type: 'SMS',
    sender_phone: '1588-0000',
    receiver_name: '김영희',
    receiver_phone: '010-0000-0003',
    title: '-',
    content: '[KT몰] 김영희님, 새 단말기(갤럭시 Z플립6) 개통 3일차 안심 케어 센터: 1588-0000',
    template_code: 'SMS_CARE_D3',
    reservation_dt: null,
    status: 'SUCCESS',
    status_desc: '정상 발송 완료 (안전 시뮬레이션)',
    result_code: '1',
    msg_id: 'ALIGO_100234',
    carrier: 'SKT',
    is_test: 'Y',
    sent_at: '2026-11-06 10:30:10',
    created_at: '2026-11-06 10:30:10'
  },
  {
    id: 2,
    msg_type: 'LMS',
    sender_phone: '1588-0000',
    receiver_name: '이철수',
    receiver_phone: '010-0000-0007',
    title: '[KT몰] 요금제 자유 변경 기간 안내',
    content: '[KT몰] 이철수님 안녕하세요.\n개통 100일이 경과하여 개통 시 가입하신 의무 요금제를 자유롭게 변경하실 수 있습니다.',
    template_code: 'SMS_PLAN_D100',
    reservation_dt: null,
    status: 'SUCCESS',
    status_desc: '정상 발송 완료 (안전 시뮬레이션)',
    result_code: '1',
    msg_id: 'ALIGO_100235',
    carrier: 'LGU+',
    is_test: 'Y',
    sent_at: '2026-11-06 11:00:05',
    created_at: '2026-11-06 11:00:05'
  }
];

let tablesInitialized = false;

const NotificationModel = {
  /**
   * sms_log, sms_template 테이블 및 sys_config 초기화
   */
  async initTables() {
    if (tablesInitialized) return;
    if (!db.getDbStatus().connected) return;

    try {
      // 1. sms_log 테이블 생성
      await db.query(`
        CREATE TABLE IF NOT EXISTS sms_log (
          id INT AUTO_INCREMENT PRIMARY KEY,
          msg_type VARCHAR(10) NOT NULL DEFAULT 'SMS',
          sender_phone VARCHAR(30) NOT NULL,
          receiver_name VARCHAR(50) DEFAULT NULL,
          receiver_phone VARCHAR(30) NOT NULL,
          title VARCHAR(150) DEFAULT NULL,
          content TEXT NOT NULL,
          template_code VARCHAR(50) DEFAULT NULL,
          reservation_dt VARCHAR(30) DEFAULT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
          status_desc VARCHAR(255) DEFAULT NULL,
          result_code VARCHAR(50) DEFAULT NULL,
          msg_id VARCHAR(50) DEFAULT NULL,
          carrier VARCHAR(30) DEFAULT NULL,
          is_test CHAR(1) DEFAULT 'N',
          sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_sent_at (sent_at),
          INDEX idx_receiver_phone (receiver_phone),
          INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 2. sms_template 테이블 생성
      await db.query(`
        CREATE TABLE IF NOT EXISTS sms_template (
          id INT AUTO_INCREMENT PRIMARY KEY,
          template_code VARCHAR(50) NOT NULL UNIQUE,
          template_name VARCHAR(100) NOT NULL,
          msg_type VARCHAR(10) NOT NULL DEFAULT 'SMS',
          condition_type VARCHAR(30) DEFAULT 'D_DAY',
          condition_days INT DEFAULT 0,
          condition_desc VARCHAR(100) DEFAULT NULL,
          send_cycle VARCHAR(30) DEFAULT 'DAILY',
          send_cycle_desc VARCHAR(100) DEFAULT NULL,
          send_time VARCHAR(20) DEFAULT '10:00',
          target_category VARCHAR(100) DEFAULT '전체',
          title VARCHAR(150) DEFAULT '',
          content TEXT NOT NULL,
          variables JSON DEFAULT NULL,
          use_yn CHAR(1) NOT NULL DEFAULT 'Y',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_code (template_code),
          INDEX idx_use_yn (use_yn)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 3. 템플릿 초기 시딩 (비어있는 경우)
      const [tplCountRows] = await db.query('SELECT COUNT(*) as cnt FROM sms_template');
      if (tplCountRows[0].cnt === 0) {
        for (const t of mockSmsTemplates) {
          await db.query(`
            INSERT INTO sms_template 
              (template_code, template_name, msg_type, condition_type, condition_days, condition_desc, send_cycle, send_cycle_desc, send_time, target_category, title, content, variables, use_yn)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            t.template_code,
            t.template_name,
            t.msg_type,
            t.condition_type,
            t.condition_days,
            t.condition_desc,
            t.send_cycle,
            t.send_cycle_desc,
            t.send_time,
            t.target_category,
            t.title,
            t.content,
            JSON.stringify(t.variables),
            t.use_yn
          ]);
        }
      }

      // 4. sys_config 에 ALIGO_CONFIG 초기 설정 확인 및 추가
      const aligoDefaults = [
        { item_code: 'API_KEY', item_name: 'Aligo API Key', item_value: process.env.ALIGO_API_KEY || '', description: '알리고 문자 발송 API 키' },
        { item_code: 'USER_ID', item_name: 'Aligo 계정 ID', item_value: process.env.ALIGO_USER_ID || '', description: '알리고 사이트 가입 계정 아이디' },
        { item_code: 'SENDER', item_name: '발신 번호', item_value: process.env.ALIGO_SENDER || '', description: '알리고에 사전 인증 등록된 발신번호' },
        { item_code: 'TESTMODE_YN', item_name: '테스트모드 여부', item_value: process.env.ALIGO_TESTMODE || 'Y', description: 'Y: 테스트모드 (건수 미차감), N: 실제 발송' }
      ];

      for (const def of aligoDefaults) {
        await db.query(`
          INSERT IGNORE INTO sys_config (group_code, item_code, item_name, item_value, description, sort_order, use_yn)
          VALUES ('ALIGO_CONFIG', ?, ?, ?, ?, 1, 'Y')
        `, [def.item_code, def.item_name, def.item_value, def.description]);
      }

      tablesInitialized = true;
    } catch (err) {
      console.error('NotificationModel.initTables Error:', err.message);
    }
  },

  /**
   * Aligo 연동 설정 조회 (sys_config 우선, 없으면 .env fallback)
   */
  async getAligoConfig() {
    await this.initTables();

    let config = {
      apiKey: process.env.ALIGO_API_KEY || '',
      userId: process.env.ALIGO_USER_ID || '',
      sender: process.env.ALIGO_SENDER || '',
      testmodeYn: process.env.ALIGO_TESTMODE || 'Y'
    };

    if (db.getDbStatus().connected) {
      try {
        const [rows] = await db.query("SELECT item_code, item_value FROM sys_config WHERE group_code = 'ALIGO_CONFIG'");
        if (rows && rows.length > 0) {
          rows.forEach(r => {
            if (r.item_code === 'API_KEY' && r.item_value) config.apiKey = r.item_value;
            if (r.item_code === 'USER_ID' && r.item_value) config.userId = r.item_value;
            if (r.item_code === 'SENDER' && r.item_value) config.sender = r.item_value;
            if (r.item_code === 'TESTMODE_YN' && r.item_value) config.testmodeYn = r.item_value;
          });
        }
      } catch (err) {
        console.error('getAligoConfig Error:', err.message);
      }
    }

    return config;
  },

  /**
   * Aligo 연동 설정 저장 (sys_config 테이블에 저장)
   */
  async saveAligoConfig({ apiKey, userId, sender, testmodeYn }) {
    await this.initTables();

    if (db.getDbStatus().connected) {
      const items = [
        { code: 'API_KEY', val: (apiKey || '').trim() },
        { code: 'USER_ID', val: (userId || '').trim() },
        { code: 'SENDER', val: (sender || '').trim() },
        { code: 'TESTMODE_YN', val: (testmodeYn || 'Y').trim().toUpperCase() }
      ];

      for (const item of items) {
        await db.query(`
          INSERT INTO sys_config (group_code, item_code, item_name, item_value, sort_order, use_yn)
          VALUES ('ALIGO_CONFIG', ?, ?, ?, 1, 'Y')
          ON DUPLICATE KEY UPDATE item_value = VALUES(item_value)
        `, [item.code, item.code, item.val]);
      }
      return { success: true };
    }

    // Mock Fallback
    if (apiKey !== undefined) process.env.ALIGO_API_KEY = apiKey;
    if (userId !== undefined) process.env.ALIGO_USER_ID = userId;
    if (sender !== undefined) process.env.ALIGO_SENDER = sender;
    if (testmodeYn !== undefined) process.env.ALIGO_TESTMODE = testmodeYn;

    return { success: true };
  },

  /**
   * 문자 템플릿 목록 조회
   */
  async getTemplates() {
    await this.initTables();

    if (db.getDbStatus().connected) {
      try {
        const [rows] = await db.query(`
          SELECT 
            id, template_code, template_name, msg_type, condition_type, condition_days, condition_desc,
            send_cycle, send_cycle_desc, send_time, target_category, title, content, variables, use_yn,
            DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
          FROM sms_template
          ORDER BY id ASC
        `);
        return rows.map(r => ({
          ...r,
          variables: typeof r.variables === 'string' ? JSON.parse(r.variables || '[]') : (r.variables || [])
        }));
      } catch (err) {
        console.error('getTemplates Error:', err.message);
      }
    }

    return mockSmsTemplates;
  },

  /**
   * 템플릿 단건 조회
   */
  async getTemplateById(id) {
    await this.initTables();

    if (db.getDbStatus().connected) {
      const [rows] = await db.query('SELECT * FROM sms_template WHERE id = ?', [id]);
      if (rows && rows.length > 0) {
        const r = rows[0];
        return {
          ...r,
          variables: typeof r.variables === 'string' ? JSON.parse(r.variables || '[]') : (r.variables || [])
        };
      }
      return null;
    }
    return mockSmsTemplates.find(t => t.id === parseInt(id, 10)) || null;
  },

  /**
   * 템플릿 저장 (신규 등록 또는 수정)
   */
  async saveTemplate(data) {
    await this.initTables();
    const {
      id,
      template_code,
      template_name,
      msg_type = 'SMS',
      condition_type = 'D_DAY',
      condition_days = 0,
      condition_desc = '',
      send_cycle = 'REALTIME',
      send_cycle_desc = '',
      send_time = '즉시',
      target_category = '전체',
      title = '',
      content = '',
      variables = [],
      use_yn = 'Y'
    } = data;

    const varsJson = JSON.stringify(Array.isArray(variables) ? variables : []);

    if (db.getDbStatus().connected) {
      if (id) {
        await db.query(`
          UPDATE sms_template SET
            template_code = ?, template_name = ?, msg_type = ?,
            condition_type = ?, condition_days = ?, condition_desc = ?,
            send_cycle = ?, send_cycle_desc = ?, send_time = ?,
            target_category = ?, title = ?, content = ?, variables = ?,
            use_yn = ?, updated_at = NOW()
          WHERE id = ?
        `, [
          template_code, template_name, msg_type,
          condition_type, parseInt(condition_days, 10) || 0, condition_desc,
          send_cycle, send_cycle_desc, send_time,
          target_category, title, content, varsJson,
          use_yn, id
        ]);
        return { success: true, id: parseInt(id, 10) };
      } else {
        const [res] = await db.query(`
          INSERT INTO sms_template (
            template_code, template_name, msg_type, condition_type, condition_days, condition_desc,
            send_cycle, send_cycle_desc, send_time, target_category, title, content, variables, use_yn
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          template_code || ('SMS_CUSTOM_' + Date.now().toString().slice(-4)),
          template_name, msg_type, condition_type, parseInt(condition_days, 10) || 0, condition_desc,
          send_cycle, send_cycle_desc, send_time, target_category, title, content, varsJson, use_yn
        ]);
        return { success: true, id: res.insertId };
      }
    } else {
      if (id) {
        const idx = mockSmsTemplates.findIndex(t => t.id === parseInt(id, 10));
        if (idx !== -1) {
          mockSmsTemplates[idx] = { ...mockSmsTemplates[idx], ...data, updated_at: new Date().toISOString() };
          return { success: true, id: parseInt(id, 10) };
        }
      } else {
        const newId = (mockSmsTemplates.length > 0 ? Math.max(...mockSmsTemplates.map(t => t.id)) : 0) + 1;
        const newTpl = {
          id: newId,
          template_code: template_code || ('SMS_CUSTOM_' + Date.now().toString().slice(-4)),
          template_name, msg_type, condition_type, condition_days: parseInt(condition_days, 10) || 0, condition_desc,
          send_cycle, send_cycle_desc, send_time, target_category, title, content, variables: Array.isArray(variables) ? variables : [], use_yn,
          updated_at: new Date().toISOString()
        };
        mockSmsTemplates.push(newTpl);
        return { success: true, id: newId };
      }
    }
  },

  /**
   * 템플릿 상태(USE / HIDE) 토글
   */
  async toggleTemplateStatus(id) {
    await this.initTables();
    if (db.getDbStatus().connected) {
      const [rows] = await db.query('SELECT use_yn FROM sms_template WHERE id = ?', [id]);
      if (rows && rows.length > 0) {
        const nextStatus = rows[0].use_yn === 'Y' ? 'N' : 'Y';
        await db.query('UPDATE sms_template SET use_yn = ?, updated_at = NOW() WHERE id = ?', [nextStatus, id]);
        return { success: true, use_yn: nextStatus };
      }
      throw new Error('해당 템플릿을 찾을 수 없습니다.');
    } else {
      const t = mockSmsTemplates.find(item => item.id === parseInt(id, 10));
      if (t) {
        t.use_yn = t.use_yn === 'Y' ? 'N' : 'Y';
        return { success: true, use_yn: t.use_yn };
      }
      throw new Error('해당 템플릿을 찾을 수 없습니다.');
    }
  },

  /**
   * 템플릿 삭제
   */
  async deleteTemplate(id) {
    await this.initTables();
    if (db.getDbStatus().connected) {
      await db.query('DELETE FROM sms_template WHERE id = ?', [id]);
      return { success: true };
    } else {
      const idx = mockSmsTemplates.findIndex(item => item.id === parseInt(id, 10));
      if (idx !== -1) {
        mockSmsTemplates.splice(idx, 1);
        return { success: true };
      }
      throw new Error('해당 템플릿을 찾을 수 없습니다.');
    }
  },

  /**
   * 발송 이력 기록 (sms_log)
   */
  async createLog({
    msg_type = 'SMS',
    sender_phone = '',
    receiver_name = '',
    receiver_phone = '',
    title = '',
    content = '',
    template_code = null,
    reservation_dt = null,
    status = 'SUCCESS',
    status_desc = '성공',
    result_code = '1',
    msg_id = null,
    carrier = null,
    is_test = 'N'
  }) {
    await this.initTables();

    if (db.getDbStatus().connected) {
      try {
        const sql = `
          INSERT INTO sms_log (
            msg_type, sender_phone, receiver_name, receiver_phone, title, content,
            template_code, reservation_dt, status, status_desc, result_code, msg_id, carrier, is_test
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await db.query(sql, [
          msg_type,
          sender_phone,
          receiver_name,
          receiver_phone,
          title || '',
          content,
          template_code,
          reservation_dt,
          status,
          status_desc,
          result_code,
          msg_id,
          carrier,
          is_test
        ]);
        return { log_id: result.insertId };
      } catch (err) {
        console.error('createLog Error:', err.message);
      }
    }

    // Mock Fallback
    const newId = (mockSmsLogs.length > 0 ? Math.max(...mockSmsLogs.map(l => l.id)) : 0) + 1;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const logItem = {
      id: newId,
      msg_type,
      sender_phone,
      receiver_name,
      receiver_phone,
      title: title || '-',
      content,
      template_code,
      reservation_dt,
      status,
      status_desc,
      result_code,
      msg_id: msg_id || `MOCK_${Date.now()}`,
      carrier: carrier || 'KT',
      is_test,
      sent_at: nowStr,
      created_at: nowStr
    };
    mockSmsLogs.unshift(logItem);
    return { log_id: newId };
  },

  /**
   * 발송 이력 목록 조회 (페이징 및 필터링)
   */
  async getHistoryList({ page = 1, limit = 20, startDate = '', endDate = '', msgType = '', status = '', keyword = '' }) {
    await this.initTables();
    const offset = (page - 1) * limit;

    if (db.getDbStatus().connected) {
      try {
        let where = [];
        let params = [];

        if (msgType) {
          where.push('msg_type = ?');
          params.push(msgType);
        }
        if (status) {
          where.push('status = ?');
          params.push(status);
        }
        if (startDate) {
          where.push('sent_at >= ?');
          params.push(`${startDate} 00:00:00`);
        }
        if (endDate) {
          where.push('sent_at <= ?');
          params.push(`${endDate} 23:59:59`);
        }
        if (keyword) {
          const pattern = `%${keyword}%`;
          where.push('(receiver_name LIKE ? OR receiver_phone LIKE ? OR title LIKE ? OR content LIKE ?)');
          params.push(pattern, pattern, pattern, pattern);
        }

        const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

        const [countRows] = await db.query(`SELECT COUNT(*) as total FROM sms_log ${whereSql}`, params);
        const total = countRows[0]?.total || 0;

        const [rows] = await db.query(`
          SELECT 
            id, msg_type, sender_phone, receiver_name, receiver_phone, title, content,
            template_code, reservation_dt, status, status_desc, result_code, msg_id, carrier, is_test,
            DATE_FORMAT(sent_at, '%Y-%m-%d %H:%i:%s') as sent_dt
          FROM sms_log
          ${whereSql}
          ORDER BY id DESC
          LIMIT ? OFFSET ?
        `, [...params, parseInt(limit, 10), parseInt(offset, 10)]);

        return {
          items: rows,
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalPages: Math.ceil(total / limit)
        };
      } catch (err) {
        console.error('getHistoryList Error:', err.message);
      }
    }

    // Mock Fallback
    let filtered = [...mockSmsLogs];
    if (msgType) filtered = filtered.filter(l => l.msg_type === msgType);
    if (status) filtered = filtered.filter(l => l.status === status);
    if (startDate) filtered = filtered.filter(l => l.sent_at >= `${startDate} 00:00:00`);
    if (endDate) filtered = filtered.filter(l => l.sent_at <= `${endDate} 23:59:59`);
    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter(l =>
        (l.receiver_name && l.receiver_name.toLowerCase().includes(kw)) ||
        (l.receiver_phone && l.receiver_phone.includes(kw)) ||
        (l.title && l.title.toLowerCase().includes(kw)) ||
        (l.content && l.content.toLowerCase().includes(kw))
      );
    }

    const total = filtered.length;
    const items = filtered.slice(offset, offset + parseInt(limit, 10));

    return {
      items,
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / limit)
    };
  },

  /**
   * 발송 통계 집계
   */
  async getHistoryStats() {
    await this.initTables();

    if (db.getDbStatus().connected) {
      try {
        const [rows] = await db.query(`
          SELECT 
            COUNT(*) as totalCount,
            COUNT(CASE WHEN DATE(sent_at) = CURDATE() THEN 1 END) as todayCount,
            COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as successCount,
            COUNT(CASE WHEN status = 'FAIL' THEN 1 END) as failCount,
            COUNT(CASE WHEN msg_type = 'SMS' THEN 1 END) as smsCount,
            COUNT(CASE WHEN msg_type = 'LMS' THEN 1 END) as lmsCount,
            COUNT(CASE WHEN msg_type = 'ALIMTALK' THEN 1 END) as alimtalkCount
          FROM sms_log
        `);
        const s = rows[0] || {};
        const total = Number(s.totalCount) || 0;
        const success = Number(s.successCount) || 0;
        const rate = total > 0 ? ((success / total) * 100).toFixed(1) + '%' : '100.0%';

        return {
          totalCount: total,
          todayCount: Number(s.todayCount) || 0,
          successCount: success,
          failCount: Number(s.failCount) || 0,
          smsCount: Number(s.smsCount) || 0,
          lmsCount: Number(s.lmsCount) || 0,
          alimtalkCount: Number(s.alimtalkCount) || 0,
          successRate: rate
        };
      } catch (err) {
        console.error('getHistoryStats Error:', err.message);
      }
    }

    const total = mockSmsLogs.length;
    const success = mockSmsLogs.filter(l => l.status === 'SUCCESS').length;
    const rate = total > 0 ? ((success / total) * 100).toFixed(1) + '%' : '100.0%';

    return {
      totalCount: total,
      todayCount: mockSmsLogs.filter(l => l.sent_at && l.sent_at.startsWith('2026-11-06')).length,
      successCount: success,
      failCount: mockSmsLogs.filter(l => l.status === 'FAIL').length,
      smsCount: mockSmsLogs.filter(l => l.msg_type === 'SMS').length,
      lmsCount: mockSmsLogs.filter(l => l.msg_type === 'LMS').length,
      alimtalkCount: mockSmsLogs.filter(l => l.msg_type === 'ALIMTALK').length,
      successRate: rate
    };
  },

  /**
   * 개통일 및 조건 기준 단체 발송 대상 고객 목록 조회
   * @param {Object} options
   * @param {string} options.condition - 타겟팅 조건 (기본: 'AFTER_183D' 개통 183일 경과)
   * @param {number} options.days - 경과 일수 기준 (기본: 183)
   * @param {string} options.keyword - 고객명/번호 필터
   * @param {number} options.limit - 최대 조회 건수 (기본: 100)
   */
  async getTargetRecipients({ condition = 'AFTER_183D', days = 183, keyword = '', limit = 100 } = {}) {
    await this.initTables();
    const targetDays = parseInt(days, 10) || 183;

    // 1. 실제 MySQL 연결 시 DB 쿼리
    if (db.getDbStatus().connected) {
      try {
        let whereClauses = ["opening_dt IS NOT NULL AND opening_dt != ''"];
        let params = [];

        if (condition === 'AFTER_183D' || condition === 'AFTER_D') {
          whereClauses.push('DATEDIFF(CURDATE(), STR_TO_DATE(opening_dt, "%Y-%m-%d")) >= ?');
          params.push(targetDays);
        } else if (condition === 'D_DAY') {
          whereClauses.push('DATEDIFF(CURDATE(), STR_TO_DATE(opening_dt, "%Y-%m-%d")) = 0');
        } else if (condition === 'AFTER_3D') {
          whereClauses.push('DATEDIFF(CURDATE(), STR_TO_DATE(opening_dt, "%Y-%m-%d")) = 3');
        } else if (condition === 'AFTER_100D') {
          whereClauses.push('DATEDIFF(CURDATE(), STR_TO_DATE(opening_dt, "%Y-%m-%d")) = 100');
        }

        if (keyword) {
          whereClauses.push('(cust_nm LIKE ? OR phone_num LIKE ? OR model_nm LIKE ?)');
          params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
        }

        const sql = `
          SELECT 
            id,
            cust_nm,
            phone_num,
            opening_dt,
            DATEDIFF(CURDATE(), STR_TO_DATE(opening_dt, '%Y-%m-%d')) AS elapsed_days,
            model_nm,
            plan_nm,
            installment_principal,
            join_category,
            agency_cd
          FROM activation_log
          WHERE ${whereClauses.join(' AND ')}
          ORDER BY opening_dt ASC
          LIMIT ?
        `;
        params.push(parseInt(limit, 10));

        const [rows] = await db.query(sql, params);
        if (rows && rows.length > 0) {
          return {
            condition,
            days: targetDays,
            total: rows.length,
            items: rows
          };
        }
      } catch (err) {
        console.warn('getTargetRecipients DB query warning, falling back to mock:', err.message);
      }
    }

    // 2. Mock Fallback 데이터셋 (183일 이상 경과 고객 필터링)
    let filtered = [...mockTargetRecipients];

    if (condition === 'AFTER_183D' || condition === 'AFTER_D') {
      filtered = filtered.filter(item => item.elapsed_days >= targetDays);
    }

    if (keyword) {
      const q = keyword.toLowerCase();
      filtered = filtered.filter(item =>
        (item.cust_nm && item.cust_nm.toLowerCase().includes(q)) ||
        (item.phone_num && item.phone_num.includes(q)) ||
        (item.model_nm && item.model_nm.toLowerCase().includes(q))
      );
    }

    return {
      condition,
      days: targetDays,
      total: filtered.length,
      items: filtered.slice(0, limit)
    };
  }
};

module.exports = NotificationModel;

