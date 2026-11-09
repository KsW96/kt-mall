const db = require('../config/db');

// In-Memory Fallback용 Mock 데이터셋 (DB 미연결 시)
let mockUsers = [];

const UserModel = {
  /**
   * 엑셀 파싱된 회원 목록 대량 UPSERT (Bulk Insert / Update)
   */
  async bulkUpsertUsers(userList) {
    if (!userList || userList.length === 0) {
      return { total: 0, affectedRows: 0 };
    }

    // 1. MySQL 연결 모드 (트랜잭션 적용: 실패/인젝션 시 전체 롤백)
    if (db.getDbStatus().connected) {
      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();

        const CHUNK_SIZE = 500;
        let totalAffected = 0;

        for (let i = 0; i < userList.length; i += CHUNK_SIZE) {
          const chunk = userList.slice(i, i + CHUNK_SIZE);
          const values = chunk.map(u => [
            u.un,
            u.nm,
            u.point,
            u.birth_dt,
            u.phone,
            u.memo,
            u.join_dt,
            u.last_login_dt,
            u.approval_yn || 'Y',
            u.status
          ]);

          const sql = `
            INSERT INTO app_user (un, nm, point, birth_dt, phone, memo, join_dt, last_login_dt, approval_yn, status)
            VALUES ?
            ON DUPLICATE KEY UPDATE
              nm = VALUES(nm),
              point = VALUES(point),
              birth_dt = VALUES(birth_dt),
              phone = VALUES(phone),
              memo = VALUES(memo),
              join_dt = VALUES(join_dt),
              last_login_dt = VALUES(last_login_dt),
              approval_yn = VALUES(approval_yn),
              status = VALUES(status)
          `;

          const [result] = await connection.query(sql, [values]);
          totalAffected += result.affectedRows;
        }

        await connection.commit();

        return {
          total: userList.length,
          affectedRows: totalAffected
        };
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    }

    // 2. Mock Fallback 모드
    for (const u of userList) {
      const idx = mockUsers.findIndex(m => m.un === u.un);
      if (idx >= 0) {
        mockUsers[idx] = { ...mockUsers[idx], ...u };
      } else {
        mockUsers.push({ no: mockUsers.length + 1, ...u });
      }
    }
    return {
      total: userList.length,
      affectedRows: userList.length
    };
  },

  /**
   * 회원 목록 조회 (페이징, 검색 조건 구분, 가입일자 기간 검색)
   */
  async findAll({ page = 1, limit = 15, keyword = '', searchType = 'all', status = '', startDate = '', endDate = '' }) {
    const offset = (page - 1) * limit;

    if (db.getDbStatus().connected) {
      try {
        let whereClauses = [];
        let params = [];

        if (keyword) {
          const pattern = `%${keyword}%`;
          if (searchType === 'nm') {
            whereClauses.push('nm LIKE ?');
            params.push(pattern);
          } else if (searchType === 'phone') {
            whereClauses.push('phone LIKE ?');
            params.push(pattern);
          } else if (searchType === 'un') {
            whereClauses.push('CAST(un AS CHAR) LIKE ?');
            params.push(pattern);
          } else {
            // all
            whereClauses.push('(nm LIKE ? OR phone LIKE ? OR CAST(un AS CHAR) LIKE ?)');
            params.push(pattern, pattern, pattern);
          }
        }

        if (status) {
          whereClauses.push('status = ?');
          params.push(status);
        }

        // 가입일자(join_dt) 기간 검색
        if (startDate) {
          whereClauses.push('join_dt >= ?');
          params.push(`${startDate} 00:00:00`);
        }
        if (endDate) {
          whereClauses.push('join_dt <= ?');
          params.push(`${endDate} 23:59:59`);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // 총 회원 수
        const [countResult] = await db.query(`SELECT COUNT(*) as total FROM app_user ${whereSql}`, params);
        const total = countResult[0]?.total || 0;

        // 목록 조회 (회원 고유번호 un 최신순 DESC 정렬)
        const [rows] = await db.query(
          `SELECT 
             no,
             un,
             nm,
             point,
             birth_dt,
             phone,
             status,
             approval_yn,
             memo,
             COALESCE(DATE_FORMAT(join_dt, '%Y-%m-%d %H:%i:%s'), join_dt) as join_dt,
             COALESCE(DATE_FORMAT(last_login_dt, '%Y-%m-%d %H:%i:%s'), last_login_dt) as last_login_dt
           FROM app_user ${whereSql} ORDER BY un DESC LIMIT ? OFFSET ?`,
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
        console.error('MySQL UserModel.findAll Error:', err.message);
      }
    }

    // Mock Fallback
    let filtered = [...mockUsers];
    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter(u => {
        if (searchType === 'nm') return u.nm.toLowerCase().includes(kw);
        if (searchType === 'phone') return u.phone && u.phone.includes(kw);
        if (searchType === 'un') return String(u.un).includes(kw);
        return u.nm.toLowerCase().includes(kw) || (u.phone && u.phone.includes(kw)) || String(u.un).includes(kw);
      });
    }
    if (status) {
      filtered = filtered.filter(u => u.status === status);
    }
    if (startDate) {
      filtered = filtered.filter(u => u.join_dt && u.join_dt >= `${startDate} 00:00:00`);
    }
    if (endDate) {
      filtered = filtered.filter(u => u.join_dt && u.join_dt <= `${endDate} 23:59:59`);
    }

    // 회원 고유번호(un) 역순(DESC) 정렬 (최신 가입 회원 상단)
    filtered.sort((a, b) => (b.un || 0) - (a.un || 0));

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
   * 회원 통계 (총원, 활동, 탈퇴, 총 포인트, 최신 업로드 일시)
   */
  async getStats() {
    let lastUploadDt = '-';

    if (db.getDbStatus().connected) {
      try {
        // 1. sys_config 에서 MEMBER_EXCEL 최근 업로드 일시 확인
        try {
          const [cfgRows] = await db.query("SELECT item_value FROM sys_config WHERE group_code = 'UPLOAD_META' AND item_code = 'MEMBER_EXCEL'");
          if (cfgRows && cfgRows[0] && cfgRows[0].item_value && cfgRows[0].item_value !== '-') {
            lastUploadDt = cfgRows[0].item_value;
          }
        } catch (e) {}

        const [rows] = await db.query(`
          SELECT 
            COUNT(*) as totalUsers,
            COUNT(CASE WHEN status = 'I' THEN 1 END) as activeUsers,
            COUNT(CASE WHEN status = 'O' THEN 1 END) as inactiveUsers,
            IFNULL(SUM(CASE WHEN status = 'I' THEN point ELSE 0 END), 0) as totalPoints
          FROM app_user
        `);
        const s = rows[0] || {};
        return {
          totalUsers: Number(s.totalUsers) || 0,
          activeUsers: Number(s.activeUsers) || 0,
          inactiveUsers: Number(s.inactiveUsers) || 0,
          totalPoints: Number(s.totalPoints) || 0,
          lastUploadDt
        };
      } catch (err) {
        console.error('MySQL UserModel.getStats Error:', err.message);
      }
    }

    try {
      const SystemModel = require('./systemModel');
      const allConfigs = await SystemModel.getAllConfigs({});
      const memberCfg = allConfigs.find(c => c.group_code === 'UPLOAD_META' && c.item_code === 'MEMBER_EXCEL');
      if (memberCfg && memberCfg.item_value && memberCfg.item_value !== '-') {
        lastUploadDt = memberCfg.item_value;
      }
    } catch (e) {}

    return {
      totalUsers: mockUsers.length,
      activeUsers: mockUsers.filter(u => u.status === 'I').length,
      inactiveUsers: mockUsers.filter(u => u.status === 'O').length,
      totalPoints: mockUsers.filter(u => u.status === 'I').reduce((acc, u) => acc + (u.point || 0), 0),
      lastUploadDt
    };
  },

  /**
   * 특정 고객 고유번호(un) 1건 상세 조회
   */
  async findByUn(un) {
    if (db.getDbStatus().connected) {
      const [rows] = await db.query('SELECT * FROM app_user WHERE un = ?', [un]);
      return rows && rows.length > 0 ? rows[0] : null;
    }

    const user = mockUsers.find(u => String(u.un) === String(un));
    return user || null;
  },

  /**
   * 특정 고객 고유번호(un) 정보 수정
   */
  async updateUser(un, { nm, birth_dt, phone, point, memo, approval_yn, status }) {
    if (db.getDbStatus().connected) {
      const sql = `
        UPDATE app_user
        SET 
          nm = ?,
          birth_dt = ?,
          phone = ?,
          point = ?,
          memo = ?,
          approval_yn = ?,
          status = ?
        WHERE un = ?
      `;
      const [result] = await db.query(sql, [
        nm ? nm.trim() : '',
        birth_dt ? birth_dt.trim() : null,
        phone ? phone.trim() : null,
        parseInt(point, 10) || 0,
        memo ? memo.trim() : null,
        approval_yn ? approval_yn.trim() : 'Y',
        status === 'O' ? 'O' : 'I',
        un
      ]);
      return { affectedRows: result.affectedRows };
    }

    const idx = mockUsers.findIndex(u => String(u.un) === String(un));
    if (idx >= 0) {
      mockUsers[idx] = {
        ...mockUsers[idx],
        nm,
        birth_dt,
        phone,
        point: parseInt(point, 10) || 0,
        memo,
        approval_yn,
        status: status === 'O' ? 'O' : 'I'
      };
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  },

  /**
   * 특정 고객 고유번호(un) 1건 삭제
   */
  async deleteByUn(un) {
    if (db.getDbStatus().connected) {
      const [result] = await db.query('DELETE FROM app_user WHERE un = ?', [un]);
      return { affectedRows: result.affectedRows };
    }

    const prevLen = mockUsers.length;
    mockUsers = mockUsers.filter(u => String(u.un) !== String(un));
    return { affectedRows: prevLen - mockUsers.length };
  },

  /**
   * 회원 데이터 전체 삭제 (TRUNCATE) 및 PK 1번부터 리셋
   */
  async clearAllUsers() {
    if (db.getDbStatus().connected) {
      await db.query('TRUNCATE TABLE app_user');
      return { success: true };
    }

    mockUsers = [];
    return { success: true };
  }
};

module.exports = UserModel;

