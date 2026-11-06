const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');

// 1. 관리자 시스템 관리 개별 페이지 (화면 렌더링 분리)
router.get('/system', (req, res) => res.redirect('/system/menus'));
router.get('/system/menus', systemController.renderMenusPage);
router.get('/system/configs', systemController.renderConfigsPage);

// 2. sys_menu 메뉴 관리 REST API
router.get('/api/system/menus', systemController.getMenus);
router.post('/api/system/menus', systemController.createMenu);
router.put('/api/system/menus/:id', systemController.updateMenu);
router.patch('/api/system/menus/:id/status', systemController.toggleMenuStatus);
router.delete('/api/system/menus/:id', systemController.deleteMenu);

// 3. sys_config 공통 설정 / 코드 관리 REST API
router.get('/api/system/configs', systemController.getConfigs);
router.post('/api/system/configs', systemController.createConfig);
router.put('/api/system/configs/:id', systemController.updateConfig);
router.delete('/api/system/configs/:id', systemController.deleteConfig);

// 4. 공인 IP 자동 감지 및 갱신 API
router.post('/api/system/detect-ip', systemController.detectPublicIp);

module.exports = router;

