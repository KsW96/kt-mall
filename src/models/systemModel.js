const db = require('../config/db');

// In-Memory Fallback용 Mock 데이터셋 (DB 미연결 시)
let mockMenus = [
  { menu_id: 1, parent_id: null, menu_name: '대시보드', menu_url: '/dashboard', menu_icon: 'bi-speedometer2', menu_depth: 1, sort_order: 1, use_yn: 'Y' },
  { menu_id: 2, parent_id: null, menu_name: '통계 분석', menu_url: '/stats', menu_icon: 'bi-bar-chart-line', menu_depth: 1, sort_order: 2, use_yn: 'Y' },
  { menu_id: 3, parent_id: null, menu_name: '데이터 조회', menu_url: '/data', menu_icon: 'bi-table', menu_depth: 1, sort_order: 3, use_yn: 'Y' },
  { menu_id: 4, parent_id: null, menu_name: '회원 관리', menu_url: '/users', menu_icon: 'bi-people-fill', menu_depth: 1, sort_order: 4, use_yn: 'Y' },
  { menu_id: 5, parent_id: null, menu_name: '개통 이력', menu_url: '/activations', menu_icon: 'bi-phone-fill', menu_depth: 1, sort_order: 5, use_yn: 'Y' },
  { menu_id: 6, parent_id: null, menu_name: '회원 개통 이력', menu_url: '/user-activations', menu_icon: 'bi-person-lines-fill', menu_depth: 1, sort_order: 6, use_yn: 'Y' },
  { menu_id: 7, parent_id: null, menu_name: '시스템 관리', menu_url: '/system/menus', menu_icon: 'bi-gear-fill', menu_depth: 1, sort_order: 7, use_yn: 'Y' },
  { menu_id: 8, parent_id: 7, menu_name: '메뉴 관리', menu_url: '/system/menus', menu_icon: 'bi-list-ul', menu_depth: 2, sort_order: 1, use_yn: 'Y' },
  { menu_id: 9, parent_id: 7, menu_name: '공통 설정 및 코드', menu_url: '/system/configs', menu_icon: 'bi-sliders', menu_depth: 2, sort_order: 2, use_yn: 'Y' },
  { menu_id: 10, parent_id: null, menu_name: '메세지 관리', menu_url: '#', menu_icon: 'bi-chat-square-text-fill', menu_depth: 1, sort_order: 8, use_yn: 'Y' },
  { menu_id: 11, parent_id: 10, menu_name: '문자 관리', menu_url: '/notifications/sms', menu_icon: 'bi-chat-dots-fill', menu_depth: 2, sort_order: 1, use_yn: 'Y' },
  { menu_id: 12, parent_id: 10, menu_name: '알림톡 관리', menu_url: '/notifications/alimtalk', menu_icon: 'bi-chat-quote-fill', menu_depth: 2, sort_order: 2, use_yn: 'Y' },
  { menu_id: 13, parent_id: 10, menu_name: '메세지 발송 이력', menu_url: '/notifications/history', menu_icon: 'bi-clock-history', menu_depth: 2, sort_order: 3, use_yn: 'Y' }
];

let mockConfigs = [
  { id: 1, group_code: 'UPLOAD_META', item_code: 'MEMBER_EXCEL', item_name: '회원정보 최근 업로드 일시', item_value: '-', description: '회원(app_user) 엑셀 파일 최근 업로드 완료 일시', sort_order: 1, use_yn: 'Y' },
  { id: 2, group_code: 'UPLOAD_META', item_code: 'OPEN_EXCEL', item_name: '개통정보 최근 업로드 일시', item_value: '-', description: '개통(activation_log) 엑셀 파일 최근 업로드 완료 일시', sort_order: 2, use_yn: 'Y' },
  { id: 3, group_code: 'SERVER_ENV', item_code: 'PUBLIC_IP', item_name: '내 공인 IP 주소', item_value: '127.0.0.1', description: '서버 또는 관리자 접속 공인 IP 주소', sort_order: 1, use_yn: 'Y' },
  { id: 4, group_code: 'SERVER_ENV', item_code: 'PORTAL_NAME', item_name: '관리자 포털 명칭', item_value: 'KT몰 관리자 포털', description: '시스템 상단 브랜드 및 브라우저 타이틀 명칭', sort_order: 2, use_yn: 'Y' }
];

const SystemModel = {
  // ==========================================
  // 1. sys_menu 메뉴 관리 메서드
  // ==========================================

  /**
   * 전체 메뉴 목록 조회 (계층형 정렬: 대메뉴 -> 하위메뉴)
   */
  async getAllMenus() {
    if (db.getDbStatus().connected) {
      try {
        const sql = `
          SELECT 
            m.menu_id,
            m.parent_id,
            p.menu_name AS parent_name,
            m.menu_name,
            m.menu_url,
            m.menu_icon,
            m.menu_depth,
            m.sort_order,
            m.use_yn,
            DATE_FORMAT(m.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
            DATE_FORMAT(m.updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
          FROM sys_menu m
          LEFT JOIN sys_menu p ON m.parent_id = p.menu_id
          ORDER BY 
            COALESCE(p.sort_order, m.sort_order) ASC,
            COALESCE(m.parent_id, m.menu_id) ASC,
            m.menu_depth ASC,
            m.sort_order ASC,
            m.menu_id ASC
        `;
        const [rows] = await db.query(sql);
        if (rows && rows.length > 0) {
          const hasNoti = rows.some(r => r.menu_url === '/notifications/sms');
          if (!hasNoti) {
            for (const m of mockMenus.filter(m => m.menu_id >= 10)) {
              await db.query(
                'INSERT IGNORE INTO sys_menu (menu_id, parent_id, menu_name, menu_url, menu_icon, menu_depth, sort_order, use_yn) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [m.menu_id, m.parent_id, m.menu_name, m.menu_url, m.menu_icon, m.menu_depth, m.sort_order, m.use_yn]
              );
            }
            const [updatedRows] = await db.query(sql);
            return updatedRows;
          }
          // 기존 '알림 관리'로 저장되어 있는 경우 '메세지 관리'로 자동 동기화
          try {
            await db.query("UPDATE sys_menu SET menu_name = '메세지 관리', menu_icon = 'bi-chat-square-text-fill' WHERE menu_id = 10 AND menu_name = '알림 관리'");
          } catch (e) {}

          // 13: 메세지 발송 이력 메뉴 자동 추가 동기화
          const hasHistory = rows.some(r => r.menu_url === '/notifications/history');
          if (!hasHistory) {
            const h = mockMenus.find(m => m.menu_id === 13);
            if (h) {
              await db.query(
                'INSERT IGNORE INTO sys_menu (menu_id, parent_id, menu_name, menu_url, menu_icon, menu_depth, sort_order, use_yn) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [h.menu_id, h.parent_id, h.menu_name, h.menu_url, h.menu_icon, h.menu_depth, h.sort_order, h.use_yn]
              );
              const [syncedRows] = await db.query(sql);
              return syncedRows;
            }
          }

          return rows;
        }
        // DB 테이블이 비어있는 경우 기본 메뉴 세팅
        for (const m of mockMenus) {
          await db.query(
            'INSERT INTO sys_menu (menu_id, parent_id, menu_name, menu_url, menu_icon, menu_depth, sort_order, use_yn) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [m.menu_id, m.parent_id, m.menu_name, m.menu_url, m.menu_icon, m.menu_depth, m.sort_order, m.use_yn]
          );
        }
        const [seededRows] = await db.query(sql);
        return seededRows;
      } catch (err) {
        console.error('SystemModel.getAllMenus Error:', err.message);
      }
    }
    return mockMenus.map(m => {
      const parent = mockMenus.find(p => p.menu_id === m.parent_id);
      return {
        ...m,
        parent_name: parent ? parent.menu_name : null,
        parent_sort_order: parent ? parent.sort_order : m.sort_order
      };
    }).sort((a, b) => {
      const pOrderDiff = (a.parent_sort_order || 0) - (b.parent_sort_order || 0);
      if (pOrderDiff !== 0) return pOrderDiff;
      const groupDiff = (a.parent_id || a.menu_id) - (b.parent_id || b.menu_id);
      if (groupDiff !== 0) return groupDiff;
      const depthDiff = (a.menu_depth || 1) - (b.menu_depth || 1);
      if (depthDiff !== 0) return depthDiff;
      const sortDiff = (a.sort_order || 0) - (b.sort_order || 0);
      if (sortDiff !== 0) return sortDiff;
      return a.menu_id - b.menu_id;
    });
  },

  /**
   * 신규 메뉴 등록
   */
  async createMenu({ parent_id = null, menu_name, menu_url = '#', menu_icon = 'bi-circle', menu_depth = 1, sort_order = 0, use_yn = 'Y' }) {
    const parentIdVal = parent_id ? parseInt(parent_id, 10) : null;
    const depthVal = parentIdVal ? (parseInt(menu_depth, 10) || 2) : 1;

    if (db.getDbStatus().connected) {
      const sql = `
        INSERT INTO sys_menu (parent_id, menu_name, menu_url, menu_icon, menu_depth, sort_order, use_yn)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      const [result] = await db.query(sql, [
        parentIdVal,
        menu_name.trim(),
        (menu_url || '#').trim(),
        (menu_icon || 'bi-circle').trim(),
        depthVal,
        parseInt(sort_order, 10) || 0,
        use_yn === 'N' ? 'N' : 'Y'
      ]);
      return { menu_id: result.insertId };
    }

    const newId = (mockMenus.length > 0 ? Math.max(...mockMenus.map(m => m.menu_id)) : 0) + 1;
    const newMenu = {
      menu_id: newId,
      parent_id: parentIdVal,
      menu_name,
      menu_url,
      menu_icon,
      menu_depth: depthVal,
      sort_order: parseInt(sort_order, 10) || 0,
      use_yn
    };
    mockMenus.push(newMenu);
    return { menu_id: newId };
  },

  /**
   * 메뉴 정보 수정
   */
  async updateMenu(menu_id, { parent_id = null, menu_name, menu_url, menu_icon, menu_depth, sort_order, use_yn }) {
    const parentIdVal = parent_id ? parseInt(parent_id, 10) : null;
    const depthVal = parentIdVal ? (parseInt(menu_depth, 10) || 2) : 1;

    if (db.getDbStatus().connected) {
      const sql = `
        UPDATE sys_menu
        SET 
          parent_id = ?,
          menu_name = ?,
          menu_url = ?,
          menu_icon = ?,
          menu_depth = ?,
          sort_order = ?,
          use_yn = ?
        WHERE menu_id = ?
      `;
      const [result] = await db.query(sql, [
        parentIdVal,
        menu_name.trim(),
        (menu_url || '#').trim(),
        (menu_icon || 'bi-circle').trim(),
        depthVal,
        parseInt(sort_order, 10) || 0,
        use_yn === 'N' ? 'N' : 'Y',
        parseInt(menu_id, 10)
      ]);
      return { affectedRows: result.affectedRows };
    }

    const idx = mockMenus.findIndex(m => m.menu_id === parseInt(menu_id, 10));
    if (idx >= 0) {
      mockMenus[idx] = {
        ...mockMenus[idx],
        parent_id: parentIdVal,
        menu_name,
        menu_url,
        menu_icon,
        menu_depth: depthVal,
        sort_order: parseInt(sort_order, 10) || 0,
        use_yn
      };
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  },

  /**
   * 메뉴 상태 토글 (USE <-> HIDE)
   */
  async toggleMenuStatus(menu_id, use_yn) {
    const id = parseInt(menu_id, 10);
    let statusVal = use_yn;
    if (statusVal !== 'Y' && statusVal !== 'N') {
      if (db.getDbStatus().connected) {
        const [rows] = await db.query('SELECT use_yn FROM sys_menu WHERE menu_id = ?', [id]);
        statusVal = (rows && rows[0] && rows[0].use_yn === 'Y') ? 'N' : 'Y';
      } else {
        const item = mockMenus.find(m => m.menu_id === id);
        statusVal = (item && item.use_yn === 'Y') ? 'N' : 'Y';
      }
    }

    if (db.getDbStatus().connected) {
      const sql = 'UPDATE sys_menu SET use_yn = ? WHERE menu_id = ?';
      const [result] = await db.query(sql, [statusVal, id]);
      return { affectedRows: result.affectedRows, use_yn: statusVal };
    }

    const idx = mockMenus.findIndex(m => m.menu_id === id);
    if (idx >= 0) {
      mockMenus[idx].use_yn = statusVal;
      return { affectedRows: 1, use_yn: statusVal };
    }
    return { affectedRows: 0, use_yn: statusVal };
  },

  /**
   * 메뉴 삭제 (하위 메뉴 존재 여부 검사)
   */
  async deleteMenu(menu_id) {
    const id = parseInt(menu_id, 10);
    if (db.getDbStatus().connected) {
      // 1. 하위 메뉴 존재 체크
      const [childRows] = await db.query('SELECT COUNT(*) as cnt FROM sys_menu WHERE parent_id = ?', [id]);
      if (childRows[0]?.cnt > 0) {
        throw new Error('하위 메뉴가 존재하는 메뉴는 먼저 하위 메뉴를 삭제하거나 이동한 후 삭제할 수 있습니다.');
      }

      const [result] = await db.query('DELETE FROM sys_menu WHERE menu_id = ?', [id]);
      return { affectedRows: result.affectedRows };
    }

    const hasChildren = mockMenus.some(m => m.parent_id === id);
    if (hasChildren) {
      throw new Error('하위 메뉴가 존재하는 메뉴는 삭제할 수 없습니다.');
    }
    const idx = mockMenus.findIndex(m => m.menu_id === id);
    if (idx >= 0) {
      mockMenus.splice(idx, 1);
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  },

  // ==========================================
  // 2. sys_config 공통 설정 / 코드 관리 메서드
  // ==========================================

  /**
   * 전체 설정 목록 조회 (그룹별 필터 옵션)
   */
  async getAllConfigs({ group_code = '' } = {}) {
    if (db.getDbStatus().connected) {
      try {
        let sql = `
          SELECT 
            id,
            group_code,
            item_code,
            item_name,
            item_value,
            description,
            sort_order,
            use_yn,
            DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at,
            DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
          FROM sys_config
        `;
        const params = [];
        if (group_code) {
          sql += ` WHERE group_code = ?`;
          params.push(group_code);
        }
        sql += ` ORDER BY group_code ASC, sort_order ASC, id ASC`;
        const [rows] = await db.query(sql, params);
        return rows;
      } catch (err) {
        console.error('SystemModel.getAllConfigs Error:', err.message);
      }
    }

    let list = [...mockConfigs];
    if (group_code) {
      list = list.filter(c => c.group_code === group_code);
    }
    return list;
  },

  /**
   * 고유 그룹 코드 목록 조회 (필터링 드롭다운용)
   */
  async getGroupCodes() {
    if (db.getDbStatus().connected) {
      try {
        const [rows] = await db.query('SELECT DISTINCT group_code FROM sys_config ORDER BY group_code ASC');
        return rows.map(r => r.group_code);
      } catch (e) {
        // fallback
      }
    }
    return Array.from(new Set(mockConfigs.map(c => c.group_code)));
  },

  /**
   * 특정 설정 단건 조회
   */
  async getConfig(group_code, item_code) {
    if (db.getDbStatus().connected) {
      const [rows] = await db.query('SELECT * FROM sys_config WHERE group_code = ? AND item_code = ?', [group_code, item_code]);
      return rows[0] || null;
    }
    return mockConfigs.find(c => c.group_code === group_code && c.item_code === item_code) || null;
  },

  /**
   * 특정 설정 값 업데이트 (Key-Value 기반 UPSERT)
   */
  async updateConfigValue(group_code, item_code, item_value) {
    if (db.getDbStatus().connected) {
      const sql = `
        INSERT INTO sys_config (group_code, item_code, item_name, item_value, sort_order, use_yn)
        VALUES (?, ?, ?, ?, 0, 'Y')
        ON DUPLICATE KEY UPDATE
          item_value = VALUES(item_value),
          updated_at = CURRENT_TIMESTAMP
      `;
      const [result] = await db.query(sql, [group_code, item_code, item_code, item_value]);
      return { affectedRows: result.affectedRows };
    }

    const target = mockConfigs.find(c => c.group_code === group_code && c.item_code === item_code);
    if (target) {
      target.item_value = item_value;
    } else {
      mockConfigs.push({
        id: mockConfigs.length + 1,
        group_code,
        item_code,
        item_name: item_code,
        item_value,
        sort_order: 0,
        use_yn: 'Y'
      });
    }
    return { affectedRows: 1 };
  },

  /**
   * 엑셀 업로드 일시 기록 헬퍼 (MEMBER_EXCEL, OPEN_EXCEL)
   */
  async recordUploadTime(item_code, customDateStr = null) {
    const pad = n => String(n).padStart(2, '0');
    const now = new Date();
    const dateStr = customDateStr || `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    
    return await this.updateConfigValue('UPLOAD_META', item_code, dateStr);
  },

  /**
   * 신규 설정 항목 등록
   */
  async createConfig({ group_code, item_code, item_name, item_value, description = '', sort_order = 0, use_yn = 'Y' }) {
    if (db.getDbStatus().connected) {
      const sql = `
        INSERT INTO sys_config (group_code, item_code, item_name, item_value, description, sort_order, use_yn)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      const [result] = await db.query(sql, [
        group_code.trim().toUpperCase(),
        item_code.trim().toUpperCase(),
        item_name.trim(),
        item_value !== undefined ? String(item_value).trim() : null,
        description ? description.trim() : null,
        parseInt(sort_order, 10) || 0,
        use_yn === 'N' ? 'N' : 'Y'
      ]);
      return { id: result.insertId };
    }

    const newId = (mockConfigs.length > 0 ? Math.max(...mockConfigs.map(c => c.id)) : 0) + 1;
    const newConfig = {
      id: newId,
      group_code: group_code.trim().toUpperCase(),
      item_code: item_code.trim().toUpperCase(),
      item_name,
      item_value,
      description,
      sort_order: parseInt(sort_order, 10) || 0,
      use_yn
    };
    mockConfigs.push(newConfig);
    return { id: newId };
  },

  /**
   * 설정 상세 수정 (ID 기반)
   */
  async updateConfigById(id, { group_code, item_code, item_name, item_value, description, sort_order, use_yn }) {
    const configId = parseInt(id, 10);
    if (db.getDbStatus().connected) {
      const sql = `
        UPDATE sys_config
        SET 
          group_code = ?,
          item_code = ?,
          item_name = ?,
          item_value = ?,
          description = ?,
          sort_order = ?,
          use_yn = ?
        WHERE id = ?
      `;
      const [result] = await db.query(sql, [
        group_code.trim().toUpperCase(),
        item_code.trim().toUpperCase(),
        item_name.trim(),
        item_value !== undefined ? String(item_value).trim() : null,
        description ? description.trim() : null,
        parseInt(sort_order, 10) || 0,
        use_yn === 'N' ? 'N' : 'Y',
        configId
      ]);
      return { affectedRows: result.affectedRows };
    }

    const idx = mockConfigs.findIndex(c => c.id === configId);
    if (idx >= 0) {
      mockConfigs[idx] = {
        ...mockConfigs[idx],
        group_code: group_code.trim().toUpperCase(),
        item_code: item_code.trim().toUpperCase(),
        item_name,
        item_value,
        description,
        sort_order: parseInt(sort_order, 10) || 0,
        use_yn
      };
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  },

  /**
   * 설정 항목 삭제
   */
  async deleteConfigById(id) {
    const configId = parseInt(id, 10);
    if (db.getDbStatus().connected) {
      const [result] = await db.query('DELETE FROM sys_config WHERE id = ?', [configId]);
      return { affectedRows: result.affectedRows };
    }

    const idx = mockConfigs.findIndex(c => c.id === configId);
    if (idx >= 0) {
      mockConfigs.splice(idx, 1);
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  },

  /**
   * 화면별 초경량 데이터 변경 감지 버전 체크
   */
  async checkDataVersion(page = 'dashboard') {
    let targetTables = ['app_user', 'activation_log'];

    if (page === 'users') targetTables = ['app_user'];
    else if (page === 'activations') targetTables = ['activation_log'];
    else if (page === 'user-activations') targetTables = ['app_user', 'activation_log'];
    else if (page === 'system-menus' || page === 'menus') targetTables = ['sys_menu'];
    else if (page === 'system-configs' || page === 'configs') targetTables = ['sys_config'];
    else if (page.includes('notification')) targetTables = ['sms_log', 'sms_template', 'sys_config'];

    if (db.getDbStatus().connected) {
      try {
        const placeholders = targetTables.map(() => '?').join(',');
        const sql = `
          SELECT 
            TABLE_NAME as name,
            COALESCE(UPDATE_TIME, CREATE_TIME, '1970-01-01 00:00:00') as upd_time,
            TABLE_ROWS as rows_cnt
          FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${placeholders})
        `;
        const [tableRows] = await db.query(sql, targetTables);

        // UPLOAD_META 최근 업로드 시점 확인
        let uploadMetaStr = '';
        try {
          const [cfg] = await db.query("SELECT item_code, item_value FROM sys_config WHERE group_code = 'UPLOAD_META'");
          if (cfg && cfg.length > 0) {
            uploadMetaStr = cfg.map(c => `${c.item_code}:${c.item_value}`).join('|');
          }
        } catch (e) {}

        const versionStr = tableRows.map(r => `${r.name}:${r.rows_cnt}:${r.upd_time}`).join('#') + (uploadMetaStr ? '@' + uploadMetaStr : '');
        return {
          version: versionStr,
          timestamp: Date.now()
        };
      } catch (err) {
        console.error('checkDataVersion Error:', err.message);
      }
    }

    return {
      version: `MOCK_${page}_${Math.floor(Date.now() / 60000)}`,
      timestamp: Date.now()
    };
  }
};

module.exports = SystemModel;

