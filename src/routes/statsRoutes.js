const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

router.get('/stats', statsController.getStatsPage);
router.get('/api/stats', statsController.getStatsApi);

module.exports = router;

