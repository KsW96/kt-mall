const express = require('express');
const path = require('path');
const os = require('os');
const morgan = require('morgan');
const { exec } = require('child_process');
require('dotenv').config();

const { initDb } = require('./config/db');
const { formatDateTime, formatDate } = require('./utils/formatDate');
const routes = require('./routes');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// EJS Template Locals Helper
app.locals.formatDateTime = formatDateTime;
app.locals.formatDate = formatDate;

// View Engine Setup (EJS)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middlewares
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', routes);

// 404 Handler
app.use((req, res, next) => {
  res.status(404).render('dashboard', {
    title: '404 Not Found',
    activeMenu: '',
    overview: { totalCount: 0, totalAmount: 0, completedCount: 0, pendingCount: 0, cancelledCount: 0 },
    categoryStats: [],
    dailyTrends: [],
    recentItems: [],
    dbStatus: { connected: false }
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  res.status(500).send('서버 내부 오류가 발생했습니다: ' + err.message);
});

// 현재 PC의 내부망 IPv4 주소 추출 함수
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// 브라우저 자동 실행 함수
function openBrowser(url) {
  const startCmd = process.platform === 'win32'
    ? `start chrome "${url}"`
    : process.platform === 'darwin'
    ? `open -a "Google Chrome" "${url}"`
    : `google-chrome "${url}"`;

  exec(startCmd, (err) => {
    if (err) {
      // Chrome 직접 실행 실패 시 기본 브라우저로 폴백
      const fallbackCmd = process.platform === 'win32' ? `start "" "${url}"` : `open "${url}"`;
      exec(fallbackCmd);
    }
  });
}

// Server Initialization
async function startServer() {
  console.log('🚀 서버를 시작합니다...');
  
  // DB 연결 시도 (실패해도 서버는 정상 실행되며 Mock 모드로 동작)
  await initDb();

  const localIp = getLocalIpAddress();

  app.listen(PORT, HOST, () => {
    const localUrl = `http://localhost:${PORT}`;
    const networkUrl = `http://${localIp}:${PORT}`;

    console.log(`=================================================`);
    console.log(`🌐 Admin Portal 서버가 실행되었습니다!`);
    console.log(`📌 로컬 접속 (현재 PC):   ${localUrl}`);
    console.log(`📡 내부망 접속 (다른 PC): ${networkUrl}`);
    console.log(`📊 주요 화면:`);
    console.log(`   - 대시보드:    ${localUrl}/dashboard`);
    console.log(`   - 통계 분석:   ${localUrl}/stats`);
    console.log(`   - 데이터 조회: ${localUrl}/data`);
    console.log(`   - 회원 관리:   ${localUrl}/users`);
    console.log(`   - 개통 이력:   ${localUrl}/activations`);
    console.log(`🚀 브라우저 창을 엽니다...`);
    console.log(`=================================================`);

    // 크롬 브라우저 창 자동 실행
    openBrowser(localUrl);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = app;

