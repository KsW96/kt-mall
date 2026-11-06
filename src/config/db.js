const mysql = require('mysql2/promise');
const { ALL_80_COLUMNS } = require('./activationColumns');
require('dotenv').config();

let pool = null;
let isDbConnected = false;

// MySQL 설정
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ktmall_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 3000 // 3초 내 응답 없으면 타임아웃
};

/**
 * 데이터베이스 기본 스키마 확인 및 생성 (자동 시드 데이터 삽입 없음)
 */
async function initSchema(dbPool) {
  // 1. app_user 테이블 생성 (존재하지 않을 때만)
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS app_user (
      no BIGINT NOT NULL AUTO_INCREMENT COMMENT '고객 기본키 (PK, 형태 유지용)',
      un BIGINT NOT NULL COMMENT '고객 고유번호 (번호)',
      nm VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '회원 이름',
      point INT NOT NULL DEFAULT '0' COMMENT '포인트',
      birth_dt VARCHAR(6) DEFAULT NULL COMMENT '생년월일 (YYMMDD 앞 6자리)',
      phone VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '휴대폰 번호 (숫자-숫자-숫자)',
      memo TEXT COLLATE utf8mb4_unicode_ci COMMENT '메모',
      join_dt VARCHAR(30) DEFAULT NULL COMMENT '가입일시',
      last_login_dt VARCHAR(30) DEFAULT NULL COMMENT '최종접속일시',
      approval_yn VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Y' COMMENT '가입승인여부',
      status ENUM('I','O') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'I' COMMENT '탈퇴여부 (I: 가입, O: 탈퇴)',
      PRIMARY KEY (no),
      UNIQUE KEY un (un),
      KEY idx_app_user_phone (phone),
      KEY idx_app_user_status (status),
      KEY idx_app_user_approval (approval_yn)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='앱 회원 테이블 (새 컬럼 규격)';
  `);

  // 2. activation_log 기존 스키마 확인 (80개 컬럼 전체 스키마로 업그레이드)
  try {
    const [cols] = await dbPool.query("SHOW COLUMNS FROM activation_log LIKE 'excel_no'");
    if (cols.length === 0) {
      // 기존 11개 컬럼 구버전 테이블 감지 -> 80개 컬럼 기본 엑셀 구조로 재생성
      await dbPool.query('DROP TABLE IF EXISTS activation_log');
    }
  } catch (e) {
    // 테이블이 없는 경우 무시
  }

  // 80개 컬럼 DDL 동적 생성
  const colSqls = ALL_80_COLUMNS.map(c => `\`${c.field}\` ${c.type} DEFAULT NULL COMMENT '${c.comment}'`).join(',\n      ');

  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS activation_log (
      id BIGINT NOT NULL AUTO_INCREMENT COMMENT '개통이력 PK',
      ${colSqls},
      created_dt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '시스템 등록일시',
      PRIMARY KEY (id),
      KEY idx_activation_mgmt (mgmt_cd),
      KEY idx_activation_phone (phone_num),
      KEY idx_activation_cust (cust_nm),
      KEY idx_activation_agency (agency_cd),
      KEY idx_activation_created_dt (created_dt)
    ) ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='개통이력 전체 로그 테이블 (80개 엑셀 컬럼 기본구조)';
  `);

  // 3. upload_error_log 테이블 생성 (인젝션 및 업로드 장애 로깅 전용)
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS upload_error_log (
      id BIGINT NOT NULL AUTO_INCREMENT COMMENT '에러 로그 고유번호 (PK)',
      upload_type_cd VARCHAR(50) NOT NULL COMMENT '업로드 구분 코드 (USER / ACTIVATION)',
      file_nm VARCHAR(255) DEFAULT NULL COMMENT '업로드 원본 파일명',
      err_cd VARCHAR(50) NOT NULL COMMENT '에러 코드 (SQL_INJECTION / DB_ERROR 등)',
      err_msg TEXT NOT NULL COMMENT '에러 메시지',
      err_detail TEXT DEFAULT NULL COMMENT '에러 상세 (위험 페이로드, 행 번호 등)',
      ip_addr VARCHAR(50) DEFAULT NULL COMMENT '요청자 IP 주소',
      created_dt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '에러 발생 일시',
      PRIMARY KEY (id),
      KEY idx_err_log_type (upload_type_cd),
      KEY idx_err_log_dt (created_dt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='업로드 에러 및 보안 로그 테이블';
  `);

  // 4. sys_menu 테이블 생성 (대·중·소메뉴 계층 구조 관리용)
  await dbPool.query(`
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

  // 5. sys_config 테이블 생성 (공통 설정, 코드, 최근 업로드 일시, 공인 IP 관리용)
  await dbPool.query(`
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

  // 6. 회원-개통이력 조인 최적화 복합 인덱스 (birth_dt + phone/phone_num)
  try {
    await dbPool.query('CREATE INDEX idx_user_join ON app_user (birth_dt, phone)');
  } catch (e) {
    // 이미 존재하는 경우 무시
  }
  try {
    await dbPool.query('CREATE INDEX idx_activation_join ON activation_log (birth_dt, phone_num)');
  } catch (e) {
    // 이미 존재하는 경우 무시
  }
}

/**
 * DB 연결 초기화 및 상태 체크 함수
 * 연결 실패 시에도 에러를 던지지 않고 안전하게 Mock 모드로 폴백합니다.
 */
async function initDb() {
  try {
    // 1. 데이터베이스 존재 여부 확인 및 생성 (root 권한 활용)
    const initConn = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      connectTimeout: dbConfig.connectTimeout
    });
    
    await initConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await initConn.end();

    // 2. 해당 DB에 커넥션 풀 생성
    pool = mysql.createPool(dbConfig);
    
    // 3. 연결 테스트 (Ping)
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    // 4. 스키마 확인
    await initSchema(pool);
    
    isDbConnected = true;
    console.log(`✅ [Database] MySQL [${dbConfig.database}] 데이터베이스에 성공적으로 연결되었습니다.`);
  } catch (error) {
    isDbConnected = false;
    console.warn('⚠️ [Database Warning] MySQL에 연결할 수 없습니다: ' + error.message);
    console.warn('💡 [Fallback Mode] 실제 DB 대신 Mock(In-Memory) 데이터 모드로 안전하게 동작합니다.');
  }
}

/**
 * DB 연결 여부 반환
 */
function getDbStatus() {
  return {
    connected: isDbConnected,
    mode: isDbConnected ? 'MySQL Connected' : 'Mock Data Mode',
    config: {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user
    }
  };
}

/**
 * 안전한 쿼리 실행 래퍼 함수
 */
async function query(sql, params = []) {
  if (!isDbConnected || !pool) {
    throw new Error('Database is not connected. Use mock data handler.');
  }
  return await pool.query(sql, params);
}

/**
 * 트랜잭션 전용 커넥션 획득 함수
 */
async function getConnection() {
  if (!isDbConnected || !pool) {
    throw new Error('Database is not connected. Use mock data handler.');
  }
  return await pool.getConnection();
}

module.exports = {
  initDb,
  getDbStatus,
  query,
  getConnection,
  get pool() {
    return pool;
  }
};

