const UserActivationModel = require('../models/userActivationModel');
const { maskCustomerName, parseMoney, calculateFinalPrincipal } = require('../utils/masking');
const { formatDate, formatDateTime } = require('../utils/formatDate');
const db = require('../config/db');

const userActivationController = {
  /**
   * 회원 개통 이력 (조인 조회 화면)
   */
  async getUserActivationPage(req, res) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const searchType = req.query.searchType || 'all';
      const keyword = (req.query.keyword || '').trim();
      const startDate = (req.query.startDate || '').trim();
      const endDate = (req.query.endDate || '').trim();

      // 1. 조인 목록 및 페이징 조회
      const result = await UserActivationModel.findUserActivations({
        page,
        limit,
        keyword,
        searchType,
        startDate,
        endDate
      });

      // 2. 상단 요약 통계 조회
      const stats = await UserActivationModel.getSummaryStats();

      // 3. 데이터 가공 (고객명 마스킹 해제 -> 원본 그대로 노출, 엑셀 원본 할부원금 파싱)
      const processedItems = result.items.map(item => {
        const rawName = item.cust_nm || item.user_nm || '';
        const factoryPriceNum = parseMoney(item.factory_price);
        const commonSubsidyNum = parseMoney(item.common_subsidy);
        const addSubsidyNum = parseMoney(item.add_subsidy);
        const installmentPrincipalNum = parseMoney(item.installment_principal);

        return {
          ...item,
          raw_name: rawName,
          masked_name: rawName, // 마스킹 해제: 원본 이름 그대로 노출
          factory_price_num: factoryPriceNum,
          common_subsidy_num: commonSubsidyNum,
          add_subsidy_num: addSubsidyNum,
          installment_principal_num: installmentPrincipalNum,
          final_principal_num: installmentPrincipalNum // 엑셀의 실제 할부원금으로 직접 매핑
        };
      });

      res.render('userActivations', {
        title: '회원 개통 이력',
        activeMenu: 'user-activations',
        baseUrl: '/user-activations',
        items: processedItems,
        stats,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        },
        filters: {
          searchType,
          keyword,
          startDate,
          endDate
        },
        formatDate,
        formatDateTime,
        dbStatus: db.getDbStatus()
      });
    } catch (err) {
      console.error('userActivationController.getUserActivationPage Error:', err);
      res.status(500).render('userActivations', {
        title: '회원 개통 이력 (오류)',
        activeMenu: 'user-activations',
        items: [],
        stats: { totalMatched: 0, uniqueUsers: 0, totalSubsidies: 0, totalPrincipal: 0 },
        pagination: { page: 1, limit: 15, total: 0, totalPages: 1 },
        filters: { searchType: 'all', keyword: '' },
        formatDate,
        formatDateTime,
        dbStatus: db.getDbStatus(),
        errorMessage: '데이터 조회 중 오류가 발생했습니다: ' + err.message
      });
    }
  }
};

module.exports = userActivationController;

