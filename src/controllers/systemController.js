const SystemModel = require('../models/systemModel');
const db = require('../config/db');

const systemController = {
  /**
   * 1. 계층형 메뉴 관리 독립 페이지 (sys_menu)
   */
  async renderMenusPage(req, res) {
    try {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      const menus = await SystemModel.getAllMenus();

      res.render('systemMenus', {
        title: '계층형 메뉴 관리',
        activeMenu: 'system-menus',
        menus,
        dbStatus: db.getDbStatus()
      });
    } catch (err) {
      console.error('systemController.renderMenusPage Error:', err);
      res.status(500).send('메뉴 관리 페이지 로드 중 오류가 발생했습니다: ' + err.message);
    }
  },

  /**
   * 2. 공통 설정 및 코드 관리 독립 페이지 (sys_config)
   */
  async renderConfigsPage(req, res) {
    try {
      const groupFilter = req.query.group || '';

      const [configs, groupCodes, allConfigs] = await Promise.all([
        SystemModel.getAllConfigs({ group_code: groupFilter }),
        SystemModel.getGroupCodes(),
        SystemModel.getAllConfigs({})
      ]);

      // 주요 설정 메타데이터 추출
      const memberUpload = allConfigs.find(c => c.group_code === 'UPLOAD_META' && c.item_code === 'MEMBER_EXCEL');
      const openUpload = allConfigs.find(c => c.group_code === 'UPLOAD_META' && c.item_code === 'OPEN_EXCEL');
      const publicIpConfig = allConfigs.find(c => c.group_code === 'SERVER_ENV' && c.item_code === 'PUBLIC_IP');

      const meta = {
        memberLastUpload: memberUpload ? memberUpload.item_value : '-',
        openLastUpload: openUpload ? openUpload.item_value : '-',
        publicIp: publicIpConfig ? publicIpConfig.item_value : (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1')
      };

      res.render('systemConfigs', {
        title: '공통 설정 및 코드 관리',
        activeMenu: 'system-configs',
        configs,
        groupCodes,
        groupFilter,
        meta,
        dbStatus: db.getDbStatus()
      });
    } catch (err) {
      console.error('systemController.renderConfigsPage Error:', err);
      res.status(500).send('공통 설정 관리 페이지 로드 중 오류가 발생했습니다: ' + err.message);
    }
  },

  /**
   * 레거시 통합 페이지 호환 리다이렉트
   */
  async renderSystemPage(req, res) {
    return res.redirect('/system/menus');
  },

  // ==========================================
  // 메뉴 관리 API
  // ==========================================

  async getMenus(req, res) {
    try {
      const menus = await SystemModel.getAllMenus();
      return res.json({ success: true, menus });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  async createMenu(req, res) {
    try {
      const { parent_id, menu_name, menu_url, menu_icon, menu_depth, sort_order, use_yn } = req.body;
      if (!menu_name || !menu_name.trim()) {
        return res.status(400).json({ success: false, message: '메뉴 이름은 필수 입력값입니다.' });
      }

      const result = await SystemModel.createMenu({
        parent_id: parent_id || null,
        menu_name: menu_name.trim(),
        menu_url: menu_url || '#',
        menu_icon: menu_icon || 'bi-circle',
        menu_depth: parseInt(menu_depth, 10) || 1,
        sort_order: parseInt(sort_order, 10) || 0,
        use_yn: use_yn === 'N' ? 'N' : 'Y'
      });

      return res.json({ success: true, message: '새 메뉴가 등록되었습니다.', result });
    } catch (err) {
      console.error('createMenu error:', err);
      return res.status(500).json({ success: false, message: '메뉴 등록 실패: ' + err.message });
    }
  },

  async updateMenu(req, res) {
    try {
      const menu_id = req.params.id;
      const { parent_id, menu_name, menu_url, menu_icon, menu_depth, sort_order, use_yn } = req.body;

      if (!menu_name || !menu_name.trim()) {
        return res.status(400).json({ success: false, message: '메뉴 이름은 필수 입력값입니다.' });
      }

      await SystemModel.updateMenu(menu_id, {
        parent_id: parent_id || null,
        menu_name: menu_name.trim(),
        menu_url: menu_url || '#',
        menu_icon: menu_icon || 'bi-circle',
        menu_depth: parseInt(menu_depth, 10) || 1,
        sort_order: parseInt(sort_order, 10) || 0,
        use_yn: use_yn === 'N' ? 'N' : 'Y'
      });

      return res.json({ success: true, message: '메뉴 정보가 수정되었습니다.' });
    } catch (err) {
      console.error('updateMenu error:', err);
      return res.status(500).json({ success: false, message: '메뉴 수정 실패: ' + err.message });
    }
  },

  async toggleMenuStatus(req, res) {
    try {
      const menu_id = req.params.id;
      const { use_yn } = req.body;
      const result = await SystemModel.toggleMenuStatus(menu_id, use_yn);
      const isUse = result.use_yn === 'Y';
      return res.json({
        success: true,
        use_yn: result.use_yn,
        message: `메뉴 표출 상태가 [${isUse ? 'USE (노출)' : 'HIDE (숨김)'}] 상태로 변경되었습니다.`
      });
    } catch (err) {
      console.error('toggleMenuStatus error:', err);
      return res.status(500).json({ success: false, message: '상태 변경 실패: ' + err.message });
    }
  },

  async deleteMenu(req, res) {
    try {
      const menu_id = req.params.id;
      await SystemModel.deleteMenu(menu_id);
      return res.json({ success: true, message: '메뉴가 성공적으로 삭제되었습니다.' });
    } catch (err) {
      console.error('deleteMenu error:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  },

  // ==========================================
  // 공통 설정 / 코드 관리 API
  // ==========================================

  async getConfigs(req, res) {
    try {
      const group_code = req.query.group || '';
      const configs = await SystemModel.getAllConfigs({ group_code });
      return res.json({ success: true, configs });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  async createConfig(req, res) {
    try {
      const { group_code, item_code, item_name, item_value, description, sort_order, use_yn } = req.body;

      if (!group_code || !item_code || !item_name) {
        return res.status(400).json({ success: false, message: '그룹 코드, 항목 코드, 항목 명칭은 필수 입력값입니다.' });
      }

      const result = await SystemModel.createConfig({
        group_code,
        item_code,
        item_name,
        item_value: item_value !== undefined ? item_value : '',
        description: description || '',
        sort_order: parseInt(sort_order, 10) || 0,
        use_yn: use_yn === 'N' ? 'N' : 'Y'
      });

      return res.json({ success: true, message: '설정 항목이 등록되었습니다.', result });
    } catch (err) {
      console.error('createConfig error:', err);
      return res.status(500).json({ success: false, message: '설정 등록 실패: ' + err.message });
    }
  },

  async updateConfig(req, res) {
    try {
      const id = req.params.id;
      const { group_code, item_code, item_name, item_value, description, sort_order, use_yn } = req.body;

      if (!group_code || !item_code || !item_name) {
        return res.status(400).json({ success: false, message: '그룹 코드, 항목 코드, 항목 명칭은 필수 입력값입니다.' });
      }

      await SystemModel.updateConfigById(id, {
        group_code,
        item_code,
        item_name,
        item_value,
        description,
        sort_order: parseInt(sort_order, 10) || 0,
        use_yn: use_yn === 'N' ? 'N' : 'Y'
      });

      return res.json({ success: true, message: '설정 항목이 수정되었습니다.' });
    } catch (err) {
      console.error('updateConfig error:', err);
      return res.status(500).json({ success: false, message: '설정 수정 실패: ' + err.message });
    }
  },

  async deleteConfig(req, res) {
    try {
      const id = req.params.id;
      await SystemModel.deleteConfigById(id);
      return res.json({ success: true, message: '설정 항목이 삭제되었습니다.' });
    } catch (err) {
      console.error('deleteConfig error:', err);
      return res.status(500).json({ success: false, message: '설정 삭제 실패: ' + err.message });
    }
  },

  /**
   * 공인 IP 감지 및 sys_config 업데이트 API
   */
  async detectPublicIp(req, res) {
    try {
      // 1. 요청 헤더 IP (Cloudflare / Proxy 대응)
      let detectedIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      if (detectedIp.includes(',')) {
        detectedIp = detectedIp.split(',')[0].trim();
      }
      if (detectedIp.startsWith('::ffff:')) {
        detectedIp = detectedIp.replace('::ffff:', '');
      }

      // 2. 외부 공인 IP 확인 시도 (선택적)
      try {
        const response = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
        if (response.ok) {
          const json = await response.json();
          if (json && json.ip) {
            detectedIp = json.ip;
          }
        }
      } catch (e) {
        // 네트워크 차단 또는 타임아웃 시 클라이언트 IP 유지
      }

      // 3. sys_config에 저장
      await SystemModel.updateConfigValue('SERVER_ENV', 'PUBLIC_IP', detectedIp);

      return res.json({
        success: true,
        ip: detectedIp,
        message: `공인 IP [${detectedIp}] 감지 및 sys_config 업데이트 완료`
      });
    } catch (err) {
      console.error('detectPublicIp error:', err);
      return res.status(500).json({ success: false, message: '공인 IP 감지 중 오류: ' + err.message });
    }
  }
};

module.exports = systemController;

