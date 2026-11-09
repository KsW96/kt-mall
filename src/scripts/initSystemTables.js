const mysql = require('mysql2/promise');
require('dotenv').config();

async function initSystemTables() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ktmall_db'
  });

  console.log('Connected to MySQL. Creating tables...');

  // 1. sys_menu table
  await conn.query(`
    CREATE TABLE IF NOT EXISTS sys_menu (
      menu_id INT NOT NULL AUTO_INCREMENT COMMENT '메뉴 고유 ID (PK)',
      parent_id INT DEFAULT NULL COMMENT '상위 메뉴 ID (대메뉴는 NULL)',
      menu_name VARCHAR(100) NOT NULL COMMENT '메뉴 이름',
      menu_url VARCHAR(255) NOT NULL DEFAULT '#' COMMENT '이동 URL',
      menu_icon VARCHAR(50) DEFAULT 'bi-circle' COMMENT '부트스트랩 아이콘 클래스',
      menu_depth INT NOT NULL DEFAULT 1 COMMENT '메뉴 계층 (1: 대메뉴, 2: 중메뉴, 3: 소메뉴)',
      sort_order INT NOT NULL DEFAULT 0 COMMENT '정렬 순서',
      use_yn CHAR(1) NOT NULL DEFAULT 'Y' COMMENT '사용 여부 (Y/N)',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
      PRIMARY KEY (menu_id),
      KEY idx_parent_id (parent_id),
      KEY idx_sort_order (sort_order),
      KEY idx_use_yn (use_yn)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='대/중/소메뉴 계층 구조 관리 테이블';
  `);
  console.log('✅ sys_menu 테이블 생성 완료');

  // 2. sys_config table
  await conn.query(`
    CREATE TABLE IF NOT EXISTS sys_config (
      id INT NOT NULL AUTO_INCREMENT COMMENT '설정 고유 ID (PK)',
      group_code VARCHAR(50) NOT NULL COMMENT '설정 그룹 코드 (UPLOAD_META, SERVER_ENV 등)',
      item_code VARCHAR(50) NOT NULL COMMENT '설정 항목 코드 (MEMBER_EXCEL, OPEN_EXCEL, PUBLIC_IP 등)',
      item_name VARCHAR(100) NOT NULL COMMENT '설정 항목 명칭',
      item_value TEXT DEFAULT NULL COMMENT '설정 값',
      description VARCHAR(255) DEFAULT NULL COMMENT '설명',
      sort_order INT NOT NULL DEFAULT 0 COMMENT '그룹 내 정렬 순서',
      use_yn CHAR(1) NOT NULL DEFAULT 'Y' COMMENT '사용 여부 (Y/N)',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
      PRIMARY KEY (id),
      UNIQUE KEY uk_group_item (group_code, item_code),
      KEY idx_group_code (group_code),
      KEY idx_use_yn (use_yn)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='공통 설정 및 코드 관리 테이블';
  `);
  console.log('✅ sys_config 테이블 생성 완료');

  // 3. sys_config seed data
  const configSeeds = [
    ['UPLOAD_META', 'MEMBER_EXCEL', '회원정보 최근 업로드 일시', '-', '회원(app_user) 엑셀 파일 최근 업로드 완료 일시', 1, 'Y'],
    ['UPLOAD_META', 'OPEN_EXCEL', '개통정보 최근 업로드 일시', '-', '개통(activation_log) 엑셀 파일 최근 업로드 완료 일시', 2, 'Y'],
    ['SERVER_ENV', 'PUBLIC_IP', '내 공인 IP 주소', '127.0.0.1', '서버 또는 관리자 접속 공인 IP 주소', 1, 'Y'],
    ['SERVER_ENV', 'PORTAL_NAME', '관리자 포털 명칭', 'KT몰 관리자 포털', '시스템 상단 브랜드 및 브라우저 타이틀 명칭', 2, 'Y']
  ];

  for (const s of configSeeds) {
    await conn.query(`
      INSERT INTO sys_config (group_code, item_code, item_name, item_value, description, sort_order, use_yn)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        item_name = VALUES(item_name),
        description = VALUES(description),
        sort_order = VALUES(sort_order),
        use_yn = VALUES(use_yn)
    `, s);
  }
  console.log('✅ sys_config 기본 시드 데이터 생성 완료');

  // 4. sys_menu seed data
  const [menuCount] = await conn.query('SELECT COUNT(*) as cnt FROM sys_menu');
  if (menuCount[0].cnt === 0) {
    const menus = [
      [1, null, '대시보드', '/dashboard', 'bi-speedometer2', 1, 1, 'Y'],
      [2, null, '통계 분석', '/stats', 'bi-bar-chart-line', 1, 2, 'Y'],
      [3, null, '데이터 조회', '/data', 'bi-table', 1, 3, 'Y'],
      [4, null, '회원 관리', '/users', 'bi-people-fill', 1, 4, 'Y'],
      [5, null, '개통 이력', '/activations', 'bi-phone-fill', 1, 5, 'Y'],
      [6, null, '회원 개통 이력', '/user-activations', 'bi-person-lines-fill', 1, 6, 'Y'],
      [7, null, '시스템 관리', '/system/menus', 'bi-gear-fill', 1, 7, 'Y'],
      [8, 7, '메뉴 관리', '/system/menus', 'bi-list-ul', 2, 1, 'Y'],
      [9, 7, '공통 설정 및 코드', '/system/configs', 'bi-sliders', 2, 2, 'Y']
    ];
    for (const m of menus) {
      await conn.query(`
        INSERT INTO sys_menu (menu_id, parent_id, menu_name, menu_url, menu_icon, menu_depth, sort_order, use_yn)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, m);
    }
    console.log('✅ sys_menu 기본 계층 메뉴 시드 데이터 생성 완료');
  }

  const [menusRows] = await conn.query('SELECT menu_id, parent_id, menu_name, menu_url, menu_depth, sort_order FROM sys_menu ORDER BY menu_depth, sort_order');
  const [configRows] = await conn.query('SELECT id, group_code, item_code, item_name, item_value FROM sys_config');

  console.log('--- sys_menu ---');
  console.table(menusRows);
  console.log('--- sys_config ---');
  console.table(configRows);

  await conn.end();
}

if (require.main === module) {
  initSystemTables()
    .then(() => {
      console.log('🎉 모든 테이블 생성 및 초기화 완료');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ 초기화 중 에러 발생:', err);
      process.exit(1);
    });
}

module.exports = { initSystemTables };

