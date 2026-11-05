const StatsModel = require('../models/statsModel');
const DataModel = require('../models/dataModel');
const db = require('../config/db');

const dashboardController = {
  async getDashboard(req, res) {
    try {
      const overview = await StatsModel.getOverview();
      const categoryStats = await StatsModel.getCategoryStats();
      const dailyTrends = await StatsModel.getDailyTrends(7);
      const recentData = await DataModel.findAll({ page: 1, limit: 5 });
      const dbStatus = db.getDbStatus();

      res.render('dashboard', {
        title: '대시보드',
        activeMenu: 'dashboard',
        overview,
        categoryStats,
        dailyTrends,
        recentItems: recentData.items,
        dbStatus
      });
    } catch (err) {
      console.error('대시보드 렌더링 에러:', err);
      res.status(500).send('대시보드 로드 중 오류가 발생했습니다.');
    }
  }
};

module.exports = dashboardController;

