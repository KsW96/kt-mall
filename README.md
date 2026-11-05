# 📊 Node.js MVC 어드민 포털 (Admin Portal)

Node.js + Express 기반의 **MVC 패턴**으로 구성된 어드민 웹 애플리케이션입니다.  
현재 데이터베이스(MySQL)가 없더라도 **서버가 에러 없이 안전하게 샘플(Mock) 데이터 모드로 즉시 구동**되며, 추후 실제 MySQL 정보를 입력하면 바로 연동할 수 있도록 설계되어 있습니다.

---

## 🗂 프로젝트 폴더 구조 (MVC Pattern)

```text
admin-portal/
├── src/
│   ├── config/             # 설정 파일
│   │   └── db.js           # MySQL 커넥터 & 연결 실패 시 Graceful Mock Fallback 처리
│   ├── controllers/        # 컨트롤러 (요청 처리 및 뷰/응답 전달)
│   │   ├── dashboardController.js # 대시보드 화면 및 요약 지표 제어
│   │   ├── statsController.js     # 통계 분석 및 차트 데이터 제어
│   │   └── dataController.js      # 데이터 목록/검색/CSV다운로드/업로드 제어
│   ├── models/             # 데이터 모델 (비즈니스 로직 & 쿼리)
│   │   ├── dataModel.js    # 데이터 조회/추가 (DB 연결 여부에 따라 자동 전환)
│   │   ├── statsModel.js   # 통계 집계 (일별 추이, 카테고리/상태별 분포)
│   │   └── mockData.js     # DB 미연결 시 사용할 기본 시드/Mock 데이터셋
│   ├── routes/             # 라우팅
│   │   ├── dashboardRoutes.js
│   │   ├── statsRoutes.js
│   │   ├── dataRoutes.js
│   │   └── index.js
│   ├── views/              # 뷰 템플릿 (EJS)
│   │   ├── partials/       # 공통 컴포넌트 (헤더, 사이드바, 푸터)
│   │   ├── dashboard.ejs   # 대시보드 메인 화면
│   │   ├── stats.ejs       # 통계 분석 화면
│   │   └── data.ejs        # 데이터 목록/검색/업로드/다운로드 화면
│   ├── public/             # 정적 리소스
│   │   ├── css/style.css   # 커스텀 어드민 스타일시트
│   │   └── js/main.js      # 프론트엔드 인터랙션 스크립트
│   └── app.js              # Express 앱 진입점
├── uploads/                # 파일 업로드 임시 디렉토리
├── .env.example            # 환경변수 템플릿
├── .env                    # 환경변수 설정 파일
└── package.json
```

---

## 🚀 빠른 시작 (Getting Started)

### 1. 패키지 설치
```bash
npm install
```

### 2. 서버 실행
```bash
# 운영 모드 실행
npm start

# 또는 nodemon 개발 모드 실행
npm run dev
```

브라우저에서 `http://localhost:3000` 접속 시 즉시 대시보드가 열립니다.

---

## 💡 주요 기능 및 특징

1. **DB 자동 감지 및 안전한 커넥터 (`src/config/db.js`)**:
   - 서버 기동 시 MySQL 연결을 시도하며, 연결할 수 없는 경우(DB 미설치 또는 접속 실패 시)에도 **프로세스가 중단되지 않고 In-Memory Mock 모드로 자동 전환**됩니다.
   - 상단 헤더에 현재 상태(`MySQL Connected` vs `Mock Data Mode`)가 뱃지로 명확히 표시됩니다.

2. **대시보드 (`/dashboard`)**:
   - 총 데이터 건수, 누적 금액, 완료/대기 건수 등 핵심 KPI 카드
   - Chart.js 기반의 일자별 등록 및 매출 추이 라인 차트
   - 카테고리 점유율 도넛 차트
   - 최근 등록된 데이터 5건 테이블

3. **통계 분석 (`/stats`)**:
   - 카테고리별 누적 금액 가로 바 차트 & 상세 점유율 테이블
   - 진행 상태별(완료/대기/취소) 파이 차트
   - 비동기 새로고침 지원

4. **데이터 조회 및 관리 (`/data`)**:
   - 키워드(건명, 관리코드, 고객명) 통합 검색
   - 카테고리 및 상태별 다중 필터링
   - 페이지네이션 (Pagination)
   - **CSV 다운로드**: 현재 필터 조건이 반영된 엑셀/CSV 파일 즉시 내보내기
   - **데이터 일괄 업로드**: Multer 기반의 파일 업로드 기능 뼈대 내장
   - **신규 데이터 등록**: 모달 폼을 통한 즉시 데이터 추가

---

## 🗄 추후 MySQL 연동 방법

MySQL 서버가 준비되면 루트 디렉토리의 `.env` 파일을 열고 접속 정보를 입력한 뒤 서버를 재시작하세요.

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=admin_db
```

### 테이블 생성 SQL (DDL)
MySQL에 `admin_db` 데이터베이스를 만들고 아래 테이블을 생성하면 즉시 실제 DB 모드로 동작합니다:

```sql
CREATE DATABASE IF NOT EXISTS admin_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE admin_db;

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount INT NOT NULL DEFAULT 0,
  status ENUM('COMPLETED', 'PENDING', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  customer VARCHAR(100) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

