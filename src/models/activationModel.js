const db = require('../config/db');
const { ALL_80_COLUMNS } = require('../config/activationColumns');

// In-Memory Fallback용 Mock 데이터셋 (DB 미연결 시)
let mockActivations = [];

const ActivationModel = {
  /**
   * 개통이력 대량 삽입 (80개 컬럼 전체 Bulk Insert)
   */
  async bulkInsertActivations(logList) {
    if (!logList || logList.length === 0) {
      return { total: 0, affectedRows: 0 };
    }

    const fieldNames = ALL_80_COLUMNS.map(c => c.field);

    // 1. MySQL 연결 모드 (트랜잭션 적용: 실패/인젝션 시 전체 롤백)
    if (db.getDbStatus().connected) {
      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();

        const CHUNK_SIZE = 500;
        let totalAffected = 0;

        for (let i = 0; i < logList.length; i += CHUNK_SIZE) {
          const chunk = logList.slice(i, i + CHUNK_SIZE);
          const values = chunk.map(l => fieldNames.map(f => (l[f] !== undefined ? l[f] : null)));

          const sql = `
            INSERT INTO activation_log (
              ${fieldNames.map(f => `\`${f}\``).join(', ')}
            )
            VALUES ?
          `;

          const [result] = await connection.query(sql, [values]);
          totalAffected += result.affectedRows;
        }

        await connection.commit();

        return {
          total: logList.length,
          affectedRows: totalAffected
        };
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    }

    // Mock Fallback 모드
    for (const l of logList) {
      mockActivations.push({
        id: mockActivations.length + 1,
        ...l,
        created_dt: new Date().toISOString().slice(0, 19).replace('T', ' ')
      });
    }
    return {
      total: logList.length,
      affectedRows: logList.length
    };
  },

  /**
   * 개통 목록 조회 (페이징, 검색 조건 구분, 개통일자 기간 검색)
   */
  async findAll({ page = 1, limit = 15, keyword = '', searchType = 'all', agency_cd = '', startDate = '', endDate = '' }) {
    const offset = (page - 1) * limit;

    if (db.getDbStatus().connected) {
      try {
        let whereClauses = [];
        let params = [];

        if (keyword) {
          const pattern = `%${keyword}%`;
          if (searchType === 'cust_nm') {
            whereClauses.push('cust_nm LIKE ?');
            params.push(pattern);
          } else if (searchType === 'phone_num') {
            whereClauses.push('phone_num LIKE ?');
            params.push(pattern);
          } else if (searchType === 'model_nm') {
            whereClauses.push('model_nm LIKE ?');
            params.push(pattern);
          } else if (searchType === 'agency_cd') {
            whereClauses.push('agency_cd LIKE ?');
            params.push(pattern);
          } else if (searchType === 'mgmt_cd') {
            whereClauses.push('mgmt_cd LIKE ?');
            params.push(pattern);
          } else if (searchType === 'serial_num') {
            whereClauses.push('serial_num LIKE ?');
            params.push(pattern);
          } else if (searchType === 'seller_nm') {
            whereClauses.push('seller_nm LIKE ?');
            params.push(pattern);
          } else if (searchType === 'join_category') {
            whereClauses.push('join_category LIKE ?');
            params.push(pattern);
          } else if (searchType === 'installment_period') {
            whereClauses.push('installment_period LIKE ?');
            params.push(pattern);
          } else {
            // all
            whereClauses.push('(cust_nm LIKE ? OR phone_num LIKE ? OR mgmt_cd LIKE ? OR model_nm LIKE ? OR agency_cd LIKE ? OR serial_num LIKE ? OR seller_nm LIKE ? OR join_category LIKE ? OR installment_period LIKE ?)');
            params.push(pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern);
          }
        }

        if (agency_cd) {
          whereClauses.push('agency_cd = ?');
          params.push(agency_cd);
        }

        // 개통일자(opening_dt) 기간 검색 (YYYY-MM-DD 형식)
        if (startDate) {
          whereClauses.push('opening_dt >= ?');
          params.push(startDate);
        }
        if (endDate) {
          whereClauses.push('opening_dt <= ?');
          params.push(endDate);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // 총 개수
        const [countResult] = await db.query(`SELECT COUNT(*) as total FROM activation_log ${whereSql}`, params);
        const total = countResult[0]?.total || 0;

        // 목록 조회
        const [rows] = await db.query(
          `SELECT 
             id,
             excel_no,
             mgmt_cd,
             opening_dt,
             cust_nm,
             phone_num,
             birth_dt,
             model_nm,
             color,
             serial_num,
             seller_nm,
             agency_cd,
             agreement_opt,
             join_category,
             installment_period,
             installment_principal,
             remark1,
             DATE_FORMAT(created_dt, '%Y-%m-%d %H:%i:%s') as created_dt
           FROM activation_log ${whereSql} ORDER BY opening_dt DESC, id DESC LIMIT ? OFFSET ?`,
          [...params, parseInt(limit, 10), parseInt(offset, 10)]
        );

        return {
          items: rows,
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalPages: Math.ceil(total / limit)
        };
      } catch (err) {
        console.error('MySQL ActivationModel.findAll Error:', err.message);
      }
    }

    // Mock Fallback
    let filtered = [...mockActivations];
    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter(l => {
        if (searchType === 'cust_nm') return l.cust_nm && l.cust_nm.toLowerCase().includes(kw);
        if (searchType === 'phone_num') return l.phone_num && l.phone_num.includes(kw);
        if (searchType === 'model_nm') return l.model_nm && l.model_nm.toLowerCase().includes(kw);
        if (searchType === 'agency_cd') return l.agency_cd && l.agency_cd.toLowerCase().includes(kw);
        if (searchType === 'mgmt_cd') return l.mgmt_cd && l.mgmt_cd.toLowerCase().includes(kw);
        if (searchType === 'serial_num') return l.serial_num && l.serial_num.toLowerCase().includes(kw);
        if (searchType === 'seller_nm') return l.seller_nm && l.seller_nm.toLowerCase().includes(kw);
        if (searchType === 'join_category') return l.join_category && l.join_category.toLowerCase().includes(kw);
        if (searchType === 'installment_period') return l.installment_period && l.installment_period.toLowerCase().includes(kw);
        return (
          (l.cust_nm && l.cust_nm.toLowerCase().includes(kw)) ||
          (l.phone_num && l.phone_num.includes(kw)) ||
          (l.mgmt_cd && l.mgmt_cd.toLowerCase().includes(kw)) ||
          (l.agency_cd && l.agency_cd.toLowerCase().includes(kw)) ||
          (l.model_nm && l.model_nm.toLowerCase().includes(kw)) ||
          (l.join_category && l.join_category.toLowerCase().includes(kw)) ||
          (l.installment_period && l.installment_period.toLowerCase().includes(kw))
        );
      });
    }
    if (agency_cd) {
      filtered = filtered.filter(l => l.agency_cd === agency_cd);
    }
    if (startDate) {
      filtered = filtered.filter(l => l.opening_dt && l.opening_dt >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(l => l.opening_dt && l.opening_dt <= endDate);
    }

    // 최신 개통일자(opening_dt) 및 id 역순(DESC) 정렬
    filtered.sort((a, b) => {
      const dateA = a.opening_dt || '';
      const dateB = b.opening_dt || '';
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return (b.id || 0) - (a.id || 0);
    });

    const total = filtered.length;
    const items = filtered.slice(offset, offset + parseInt(limit, 10));

    return {
      items,
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / limit)
    };
  },

  /**
   * 통계 집계
   */
  async getStats() {
    let lastUploadDt = '-';

    if (db.getDbStatus().connected) {
      try {
        // 1. sys_config 에서 OPEN_EXCEL 최근 업로드 일시 확인
        try {
          const [cfgRows] = await db.query("SELECT item_value FROM sys_config WHERE group_code = 'UPLOAD_META' AND item_code = 'OPEN_EXCEL'");
          if (cfgRows && cfgRows[0] && cfgRows[0].item_value && cfgRows[0].item_value !== '-') {
            lastUploadDt = cfgRows[0].item_value;
          }
        } catch (e) {}

        const [rows] = await db.query(`
          SELECT 
            COUNT(*) as totalCount,
            COUNT(DISTINCT agency_cd) as agencyCount,
            COUNT(DISTINCT model_nm) as modelCount,
            COUNT(CASE WHEN DATE(created_dt) = CURDATE() THEN 1 END) as todayCount,
            MAX(DATE_FORMAT(created_dt, '%Y-%m-%d %H:%i:%s')) as maxCreatedDt
          FROM activation_log
        `);
        const s = rows[0] || {};

        if ((!lastUploadDt || lastUploadDt === '-') && s.maxCreatedDt) {
          lastUploadDt = s.maxCreatedDt;
        }

        return {
          totalCount: Number(s.totalCount) || 0,
          agencyCount: Number(s.agencyCount) || 0,
          modelCount: Number(s.modelCount) || 0,
          todayCount: Number(s.todayCount) || 0,
          lastUploadDt
        };
      } catch (err) {
        console.error('MySQL ActivationModel.getStats Error:', err.message);
      }
    }

    try {
      const SystemModel = require('./systemModel');
      const allConfigs = await SystemModel.getAllConfigs({});
      const openCfg = allConfigs.find(c => c.group_code === 'UPLOAD_META' && c.item_code === 'OPEN_EXCEL');
      if (openCfg && openCfg.item_value && openCfg.item_value !== '-') {
        lastUploadDt = openCfg.item_value;
      }
    } catch (e) {}

    if (lastUploadDt === '-' && mockActivations.length > 0) {
      const latest = mockActivations[mockActivations.length - 1];
      if (latest && latest.created_dt) {
        lastUploadDt = latest.created_dt;
      }
    }

    return {
      totalCount: mockActivations.length,
      agencyCount: new Set(mockActivations.map(m => m.agency_cd).filter(Boolean)).size,
      modelCount: new Set(mockActivations.map(m => m.model_nm).filter(Boolean)).size,
      todayCount: mockActivations.length,
      lastUploadDt
    };
  },

  /**
   * 단건 개통 이력 80개 전체 컬럼 상세 조회
   */
  async findById(id) {
    if (db.getDbStatus().connected) {
      const [rows] = await db.query('SELECT * FROM activation_log WHERE id = ?', [id]);
      return rows && rows.length > 0 ? rows[0] : null;
    }

    const item = mockActivations.find(l => String(l.id) === String(id));
    return item || null;
  },

  /**
   * 단건 개통 이력 정보 수정 (80개 컬럼 동적 UPDATE)
   */
  async updateActivation(id, data) {
    const validFields = ALL_80_COLUMNS.map(c => c.field);
    const updateClauses = [];
    const values = [];

    validFields.forEach(field => {
      if (data[field] !== undefined) {
        updateClauses.push(`\`${field}\` = ?`);
        values.push(data[field] === '' ? null : data[field]);
      }
    });

    if (updateClauses.length === 0) {
      return { affectedRows: 0 };
    }

    if (db.getDbStatus().connected) {
      values.push(id);
      const sql = `UPDATE activation_log SET ${updateClauses.join(', ')} WHERE id = ?`;
      const [result] = await db.query(sql, values);
      return { affectedRows: result.affectedRows };
    }

    const idx = mockActivations.findIndex(l => String(l.id) === String(id));
    if (idx >= 0) {
      validFields.forEach(field => {
        if (data[field] !== undefined) {
          mockActivations[idx][field] = data[field] === '' ? null : data[field];
        }
      });
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  },

  /**
   * 단건 삭제
   */
  async deleteById(id) {
    if (db.getDbStatus().connected) {
      const [result] = await db.query('DELETE FROM activation_log WHERE id = ?', [id]);
      return { affectedRows: result.affectedRows };
    }

    const prevLen = mockActivations.length;
    mockActivations = mockActivations.filter(l => String(l.id) !== String(id));
    return { affectedRows: prevLen - mockActivations.length };
  },

  /**
   * 전체 비우기 (TRUNCATE)
   */
  async clearAllActivations() {
    if (db.getDbStatus().connected) {
      await db.query('TRUNCATE TABLE activation_log');
      return { success: true };
    }

    mockActivations = [];
    return { success: true };
  }
};

module.exports = ActivationModel;
