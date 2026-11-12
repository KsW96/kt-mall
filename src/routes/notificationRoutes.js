const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// 상위 메뉴 URL 접근 시 하위 메뉴 첫 번째(문자 관리)로 자동 리다이렉트
router.get('/notifications', (req, res) => res.redirect('/notifications/sms'));

// 하위 메뉴 개별 페이지
router.get('/notifications/sms', notificationController.renderSmsPage);
router.get('/notifications/alimtalk', notificationController.renderAlimtalkPage);
router.get('/notifications/history', notificationController.renderHistoryPage);

// Aligo SMS 연동 API
router.post('/api/notifications/sms/send-test', notificationController.sendTestSms);
router.post('/api/notifications/sms/send-bulk', notificationController.sendBulkSms);
router.post('/api/notifications/sms/config', notificationController.saveConfig);
router.get('/api/notifications/sms/remain', notificationController.getRemain);
router.get('/api/notifications/sms/target-recipients', notificationController.getTargetRecipients);

// 템플릿 관리 API
router.post('/api/notifications/templates/save', notificationController.saveTemplate);
router.post('/api/notifications/templates/:id/toggle', notificationController.toggleTemplateStatus);
router.delete('/api/notifications/templates/:id', notificationController.deleteTemplate);

module.exports = router;

