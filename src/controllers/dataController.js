const DataModel = require('../models/dataModel');
const db = require('../config/db');

const dataController = {
  /**
   * 데이터 조회 목록 페이지
   */
  async getDataList(req, res) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const keyword = (req.query.keyword || '').trim();
      const category = (req.query.category || '').trim();
      const status = (req.query.status || '').trim();

      const result = await DataModel.findAll({ page, limit, keyword, category, status });
      const categories = await DataModel.getCategories();
      const dbStatus = db.getDbStatus();

      res.render('data', {
        title: '데이터 조회 및 관리',
        activeMenu: 'data',
        items: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        },
        filters: { keyword, category, status },
        categories,
        dbStatus
      });
    } catch (err) {
      console.error('데이터 조회 에러:', err);
      res.status(500).send('데이터 목록 로드 중 오류가 발생했습니다.');
    }
  },

  /**
   * 단건 상세 조회 (JSON)
   */
  async getDataDetail(req, res) {
    try {
      const id = req.params.id;
      const item = await DataModel.findById(id);
      if (!item) {
        return res.status(404).json({ success: false, message: '데이터를 찾을 수 없습니다.' });
      }
      res.json({ success: true, item });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
   * CSV 다운로드 기능
   */
  async downloadCsv(req, res) {
    try {
      const keyword = (req.query.keyword || '').trim();
      const category = (req.query.category || '').trim();
      const status = (req.query.status || '').trim();

      // 전체 데이터 조회 (다운로드는 제한 없이)
      const result = await DataModel.findAll({ page: 1, limit: 10000, keyword, category, status });
      
      // UTF-8 BOM 추가 (엑셀에서 한글 깨짐 방지)
      let csvContent = '\uFEFF';
      csvContent += 'ID,관리코드,건명,카테고리,금액(원),상태,고객명,등록일시,비고\n';

      result.items.forEach(row => {
        const cleanTitle = (row.title || '').replace(/"/g, '""');
        const cleanNotes = (row.notes || '').replace(/"/g, '""');
        csvContent += `"${row.id}","${row.code}","${cleanTitle}","${row.category}","${row.amount}","${row.status}","${row.customer}","${row.createdAt || row.created_at || ''}","${cleanNotes}"\n`;
      });

      const filename = `data_export_${new Date().toISOString().slice(0, 10)}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csvContent);
    } catch (err) {
      console.error('CSV 다운로드 에러:', err);
      res.status(500).send('CSV 다운로드 처리 중 오류가 발생했습니다.');
    }
  },

  /**
   * 신규 데이터 등록 (모달 또는 폼 제출)
   */
  async createData(req, res) {
    try {
      const { title, category, amount, customer, status, notes } = req.body;

      if (!title || !category || !customer) {
        return res.status(400).json({ success: false, message: '필수 항목이 누락되었습니다.' });
      }

      const newItem = await DataModel.create({
        code: `ORD-2026-${Math.floor(100 + Math.random() * 900)}`,
        title,
        category,
        amount: parseInt(amount, 10) || 0,
        status: status || 'PENDING',
        customer,
        notes: notes || ''
      });

      res.json({ success: true, item: newItem });
    } catch (err) {
      console.error('데이터 생성 에러:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
   * 파일 업로드 처리 (뼈대)
   */
  async uploadData(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: '업로드할 파일이 없습니다.' });
      }

      // 실제 업로드 파일 처리 로직 (CSV 또는 Excel 파싱)
      // 현재는 샘플 업로드 성공 응답 반환
      res.json({
        success: true,
        message: `파일 [${req.file.originalname}]이(가) 성공적으로 수신되었습니다. (파서 연동 준비 완료)`,
        filename: req.file.filename,
        size: req.file.size
      });
    } catch (err) {
      console.error('업로드 처리 에러:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

module.exports = dataController;

