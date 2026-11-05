const express = require('express');
const router = express.Router();
const userActivationController = require('../controllers/userActivationController');

// 회원 개통 이력 (조인 조회 화면)
router.get('/user-activations', userActivationController.getUserActivationPage);

module.exports = router;

