const StatsModel = require('../models/statsModel');
const db = require('../config/db');

const statsController = {
  async getStatsPage(req, res) {
    try {
      const overview = await StatsModel.getOverview();
      const categoryStats = await StatsModel.getCategoryStats();
      const dailyTrends = await StatsModel.getDailyTrends(10);
      const statusDistribution = await StatsModel.getStatusDistribution();
      const dbStatus = db.getDbStatus();

      res.render('stats', {
        title: '통계 분석',
        activeMenu: 'stats',
        overview,
        categoryStats,
        dailyTrends,
        statusDistribution,
        dbStatus
      });
    } catch (err) {
      console.error('통계 페이지 렌더링 에러:', err);
      res.status(500).send('통계 페이지 로드 중 오류가 발생했습니다.');
    }
  },

  async getStatsApi(req, res) {
    try {
      const days = parseInt(req.query.days, 10) || 7;
      const overview = await StatsModel.getOverview();
      const categoryStats = await StatsModel.getCategoryStats();
      const dailyTrends = await StatsModel.getDailyTrends(days);
      const statusDistribution = await StatsModel.getStatusDistribution();

      res.json({
        success: true,
        data: {
          overview,
          categoryStats,
          dailyTrends,
          statusDistribution
        }
      });
    } catch (err) {
      console.error('통계 API 에러:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

module.exports = statsController;

