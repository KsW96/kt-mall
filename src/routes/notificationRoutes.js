const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// 상위 메뉴 URL 접근 시 하위 메뉴 첫 번째(문자 관리)로 자동 리다이렉트
router.get('/notifications', (req, res) => res.redirect('/notifications/sms'));

// 하위 메뉴 개별 페이지
router.get('/notifications/sms', notificationController.renderSmsPage);
router.get('/notifications/alimtalk', notificationController.renderAlimtalkPage);

module.exports = router;

