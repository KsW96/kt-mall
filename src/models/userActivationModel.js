const db = require('../config/db');
const { parseMoney, calculateFinalPrincipal } = require('../utils/masking');

const UserActivationModel = {
  /**
   * 회원(app_user)과 개통이력(activation_log) 조인 목록 조회
   * 조인 기준: 생년월일(birth_dt) AND 전화번호(phone = phone_num)
   */
  async findUserActivations({ page = 1, limit = 15, keyword = '', searchType = 'all', startDate = '', endDate = '' }) {
    const offset = (page - 1) * limit;

    // 1. MySQL 연결 모드
    if (db.getDbStatus().connected) {
      try {
        let whereClauses = [];
        let params = [];

        if (keyword) {
          const pattern = `%${keyword}%`;
          if (searchType === 'cust_nm') {
            whereClauses.push('(u.nm LIKE ? OR a.cust_nm LIKE ?)');
            params.push(pattern, pattern);
          } else if (searchType === 'phone_num') {
            whereClauses.push('(u.phone LIKE ? OR a.phone_num LIKE ?)');
            params.push(pattern, pattern);
          } else if (searchType === 'model_nm') {
            whereClauses.push('a.model_nm LIKE ?');
            params.push(pattern);
          } else if (searchType === 'plan_nm') {
            whereClauses.push('a.plan_nm LIKE ?');
            params.push(pattern);
          } else if (searchType === 'join_category') {
            whereClauses.push('a.join_category LIKE ?');
            params.push(pattern);
          } else {
            // all
            whereClauses.push('(u.nm LIKE ? OR a.cust_nm LIKE ? OR a.phone_num LIKE ? OR a.model_nm LIKE ? OR a.plan_nm LIKE ? OR a.join_category LIKE ? OR a.installment_period LIKE ?)');
            params.push(pattern, pattern, pattern, pattern, pattern, pattern, pattern);
          }
        }

        // 개통일자(a.opening_dt) 기간 검색
        if (startDate) {
          whereClauses.push('a.opening_dt >= ?');
          params.push(startDate);
        }
        if (endDate) {
          whereClauses.push('a.opening_dt <= ?');
          params.push(endDate);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // 총 매칭 건수 및 고유 회원 수 조회
        const countSql = `
          SELECT 
            COUNT(*) AS total,
            COUNT(DISTINCT u.no) AS uniqueUsers
          FROM app_user u
          INNER JOIN activation_log a 
            ON u.birth_dt = a.birth_dt 
           AND u.phone = a.phone_num
          ${whereSql}
        `;
        const [countResult] = await db.query(countSql, params);
        const total = countResult[0]?.total || 0;
        const uniqueUsers = countResult[0]?.uniqueUsers || 0;

        // 조인 목록 조회
        const listSql = `
          SELECT 
            u.no AS user_no,
            u.un AS user_un,
            u.nm AS user_nm,
            a.id AS activation_id,
            a.cust_nm,
            a.birth_dt,
            a.phone_num,
            a.opening_dt,
            a.join_category,
            a.model_nm,
            a.color,
            a.plan_nm,
            a.installment_period,
            a.installment_principal,
            a.agreement_opt,
            a.factory_price,
            a.common_subsidy,
            a.add_subsidy,
            a.created_dt
          FROM app_user u
          INNER JOIN activation_log a 
            ON u.birth_dt = a.birth_dt 
           AND u.phone = a.phone_num
          ${whereSql}
          ORDER BY a.opening_dt DESC, a.id DESC
          LIMIT ? OFFSET ?
        `;

        const [rows] = await db.query(listSql, [...params, parseInt(limit, 10), parseInt(offset, 10)]);

        return {
          items: rows,
          total,
          uniqueUsers,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalPages: Math.ceil(total / limit)
        };
      } catch (err) {
        console.error('MySQL UserActivationModel.findUserActivations Error:', err.message);
      }
    }

    // 2. Mock Fallback 모드
    return {
      items: [],
      total: 0,
      uniqueUsers: 0,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: 1
    };
  },

  /**
   * 통계 지표 산출 (총 매칭 건수, 고유 회원 수, 총 지원금, 총 최종할부원금, 최신 업로드 일시)
   */
  async getSummaryStats() {
    let lastUploadDt = '-';
    let memberLastUpload = '-';

    if (db.getDbStatus().connected) {
      try {
        // 1. sys_config 에서 OPEN_EXCEL 및 MEMBER_EXCEL 최근 업로드 일시 확인
        try {
          const [cfgRows] = await db.query("SELECT item_code, item_value FROM sys_config WHERE group_code = 'UPLOAD_META' AND item_code IN ('OPEN_EXCEL', 'MEMBER_EXCEL')");
          for (const row of cfgRows) {
            if (row.item_code === 'OPEN_EXCEL' && row.item_value && row.item_value !== '-') {
              lastUploadDt = row.item_value;
            }
            if (row.item_code === 'MEMBER_EXCEL' && row.item_value && row.item_value !== '-') {
              memberLastUpload = row.item_value;
            }
          }
        } catch (e) {}

        if (lastUploadDt === '-') {
          try {
            const [actRows] = await db.query("SELECT MAX(DATE_FORMAT(created_dt, '%Y-%m-%d %H:%i:%s')) as maxDt FROM activation_log");
            if (actRows && actRows[0] && actRows[0].maxDt) {
              lastUploadDt = actRows[0].maxDt;
            }
          } catch (e) {}
        }

        // 1. 총 매칭 건수 및 고유 회원 수 집계
        const countSql = `
          SELECT 
            COUNT(*) AS totalMatched,
            COUNT(DISTINCT u.no) AS uniqueUsers
          FROM app_user u
          INNER JOIN activation_log a 
            ON u.birth_dt = a.birth_dt 
           AND u.phone = a.phone_num
        `;
        const [counts] = await db.query(countSql);
        const totalMatched = counts[0]?.totalMatched || 0;
        const uniqueUsers = counts[0]?.uniqueUsers || 0;

        let totalSubsidies = 0;
        let totalPrincipal = 0;

        // 2. 금액 계산 (매칭 건수가 1건 이상일 때 - 엑셀의 실제 할부원금 합산)
        if (totalMatched > 0) {
          const moneySql = `
            SELECT 
              a.installment_principal,
              a.common_subsidy,
              a.add_subsidy
            FROM app_user u
            INNER JOIN activation_log a 
              ON u.birth_dt = a.birth_dt 
             AND u.phone = a.phone_num
          `;
          const [rows] = await db.query(moneySql);

          for (const row of rows) {
            const common = parseMoney(row.common_subsidy);
            const add = parseMoney(row.add_subsidy);
            const principal = parseMoney(row.installment_principal);

            totalSubsidies += (common + add);
            totalPrincipal += principal;
          }
        }

        return {
          totalMatched,
          uniqueUsers,
          totalSubsidies,
          totalPrincipal,
          lastUploadDt,
          openLastUpload: lastUploadDt,
          memberLastUpload
        };
      } catch (err) {
        console.error('UserActivationModel.getSummaryStats Error:', err.message);
      }
    }

    try {
      const SystemModel = require('./systemModel');
      const allConfigs = await SystemModel.getAllConfigs({});
      const openCfg = allConfigs.find(c => c.group_code === 'UPLOAD_META' && c.item_code === 'OPEN_EXCEL');
      const memberCfg = allConfigs.find(c => c.group_code === 'UPLOAD_META' && c.item_code === 'MEMBER_EXCEL');
      if (openCfg && openCfg.item_value) lastUploadDt = openCfg.item_value;
      if (memberCfg && memberCfg.item_value) memberLastUpload = memberCfg.item_value;
    } catch (e) {}

    return {
      totalMatched: 0,
      uniqueUsers: 0,
      totalSubsidies: 0,
      totalPrincipal: 0,
      lastUploadDt,
      openLastUpload: lastUploadDt,
      memberLastUpload
    };
  }
};

module.exports = UserActivationModel;
