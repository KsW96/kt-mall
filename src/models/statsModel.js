const db = require('../config/db');
const { getMockData } = require('./mockData');

const StatsModel = {
  /**
   * 대시보드 메인 요약 지표
   */
  async getOverview() {
    if (db.getDbStatus().connected) {
      try {
        const [summary] = await db.query(`
          SELECT 
            COUNT(*) as totalCount,
            IFNULL(SUM(amount), 0) as totalAmount,
            COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completedCount,
            COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pendingCount,
            COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelledCount
          FROM orders
        `);
        const s = summary[0] || {};
        return {
          totalCount: Number(s.totalCount) || 0,
          totalAmount: Number(s.totalAmount) || 0,
          completedCount: Number(s.completedCount) || 0,
          pendingCount: Number(s.pendingCount) || 0,
          cancelledCount: Number(s.cancelledCount) || 0
        };
      } catch (err) {
        console.error('MySQL getOverview Error:', err.message);
      }
    }

    // Mock 집계
    const items = getMockData();
    const totalCount = items.length;
    const totalAmount = items.reduce((acc, cur) => acc + (cur.amount || 0), 0);
    const completedCount = items.filter(i => i.status === 'COMPLETED').length;
    const pendingCount = items.filter(i => i.status === 'PENDING').length;
    const cancelledCount = items.filter(i => i.status === 'CANCELLED').length;

    return {
      totalCount,
      totalAmount,
      completedCount,
      pendingCount,
      cancelledCount
    };
  },

  /**
   * 카테고리별 통계 (차트용)
   */
  async getCategoryStats() {
    if (db.getDbStatus().connected) {
      try {
        const [rows] = await db.query(`
          SELECT 
            category, 
            COUNT(*) as count, 
            SUM(amount) as totalAmount
          FROM orders 
          GROUP BY category
          ORDER BY totalAmount DESC
        `);
        return rows.map(r => ({
          category: r.category,
          count: Number(r.count) || 0,
          totalAmount: Number(r.totalAmount) || 0
        }));
      } catch (err) {
        console.error('MySQL getCategoryStats Error:', err.message);
      }
    }

    // Mock 집계
    const items = getMockData();
    const map = {};
    items.forEach(item => {
      if (!map[item.category]) {
        map[item.category] = { category: item.category, count: 0, totalAmount: 0 };
      }
      map[item.category].count += 1;
      map[item.category].totalAmount += item.amount;
    });

    return Object.values(map).sort((a, b) => b.totalAmount - a.totalAmount);
  },

  /**
   * 최근 일자별 추이 통계 (라인 차트용)
   */
  async getDailyTrends(days = 7) {
    if (db.getDbStatus().connected) {
      try {
        const [rows] = await db.query(`
          SELECT 
            DATE_FORMAT(created_at, '%Y-%m-%d') as date,
            COUNT(*) as count,
            SUM(amount) as totalAmount
          FROM orders
          GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
          ORDER BY date DESC
          LIMIT ?
        `, [days]);
        return rows.reverse().map(r => ({
          date: r.date,
          count: Number(r.count) || 0,
          totalAmount: Number(r.totalAmount) || 0
        }));
      } catch (err) {
        console.error('MySQL getDailyTrends Error:', err.message);
      }
    }

    // Mock 집계
    const items = getMockData();
    const dateMap = {};

    items.forEach(item => {
      const date = item.createdAt.substring(0, 10);
      if (!dateMap[date]) {
        dateMap[date] = { date, count: 0, totalAmount: 0 };
      }
      dateMap[date].count += 1;
      dateMap[date].totalAmount += item.amount;
    });

    const dates = Object.keys(dateMap).sort();
    const recentDates = dates.slice(-days);
    return recentDates.map(d => dateMap[d]);
  },

  /**
   * 상태별 비율 통계 (도넛 차트용)
   */
  async getStatusDistribution() {
    const overview = await this.getOverview();
    return [
      { status: '완료 (COMPLETED)', count: overview.completedCount, color: '#10B981' },
      { status: '대기 (PENDING)', count: overview.pendingCount, color: '#F59E0B' },
      { status: '취소 (CANCELLED)', count: overview.cancelledCount, color: '#EF4444' }
    ];
  }
};

module.exports = StatsModel;

