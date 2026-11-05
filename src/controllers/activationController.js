const fs = require('fs');
const ActivationModel = require('../models/activationModel');
const ErrorLogModel = require('../models/errorLogModel');
const { scanRowsForInjection } = require('../utils/security');
const { parseActivationExcel } = require('../utils/excelParser');
const db = require('../config/db');

const activationController = {
  /**
   * 개통 이력 목록 페이지 렌더링
   */
  async getActivationListPage(req, res) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const keyword = (req.query.keyword || '').trim();
      const searchType = (req.query.searchType || 'all').trim();
      const agency_cd = (req.query.agency_cd || '').trim();
      const startDate = (req.query.startDate || '').trim();
      const endDate = (req.query.endDate || '').trim();

      const result = await ActivationModel.findAll({ page, limit, keyword, searchType, agency_cd, startDate, endDate });
      const stats = await ActivationModel.getStats();
      const dbStatus = db.getDbStatus();

      res.render('activations', {
        title: '개통 이력 관리 (activation_log)',
        activeMenu: 'activations',
        baseUrl: '/activations',
        items: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        },
        filters: { keyword, searchType, agency_cd, startDate, endDate },
        stats,
        dbStatus
      });
    } catch (err) {
      console.error('개통 이력 조회 에러:', err);
      res.status(500).send('개통 이력 로드 중 오류가 발생했습니다: ' + err.message);
    }
  },

  /**
   * 개통 엑셀 업로드 처리 (보안 인젝션 검사 및 트랜잭션 롤백, 에러 로깅 연동)
   */
  async uploadExcel(req, res) {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '업로드할 엑셀 파일이 없습니다.' });
    }

    const filePath = req.file.path;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const originalFileName = req.file.originalname || 'unknown.xlsx';

    try {
      const { logs, totalRows, errors } = parseActivationExcel(filePath);

      if (logs.length === 0) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return res.status(400).json({
          success: false,
          message: '유효한 개통 이력 데이터 행을 찾을 수 없습니다. (고객명, 개통번호 확인 필요)'
        });
      }

      // 1. SQL Injection 및 악성 스크립트 정밀 스캔
      const scanResult = scanRowsForInjection(logs);
      if (scanResult.detected) {
        const v = scanResult.violation;
        console.warn(`🚨 [Security Alert] 개통 엑셀 업로드 중 보안 위협 감지: [${v.patternName}] 패턴 (행: ${v.rowNumber}, 컬럼: ${v.field})`);

        // 에러 로그 테이블(upload_error_log)에 기록 후 업로드 원천 차단
        await ErrorLogModel.createLog({
          upload_type_cd: 'ACTIVATION',
          file_nm: originalFileName,
          err_cd: v.type, // 'SQL_INJECTION' or 'SCRIPT_INJECTION'
          err_msg: `보안 위협 감지: [${v.patternName}] 패턴이 ${v.rowNumber}번째 행의 [${v.field}] 컬럼에서 발견되었습니다.`,
          err_detail: {
            rowNumber: v.rowNumber,
            field: v.field,
            pattern: v.patternName,
            matchedSnippet: v.match,
            fullValue: v.value
          },
          ip_addr: clientIp
        });

        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        // 보안상 공격자에게 내부 상세를 노출하지 않고 관리자 문의 메시지 반환
        return res.status(400).json({
          success: false,
          message: '해당 과정에서 문제가 발생했습니다. 관리자에게 문의해 주세요.'
        });
      }

      // 2. MySQL 대량 삽입 (트랜잭션 실행)
      const result = await ActivationModel.bulkInsertActivations(logs);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return res.json({
        success: true,
        totalParsed: logs.length,
        affectedRows: result.affectedRows,
        errors: errors.slice(0, 5),
        message: `총 ${logs.length}건의 개통 데이터가 성공적으로 등록되었습니다.`
      });
    } catch (err) {
      console.error('개통 엑셀 업로드 처리 중 예외 발생:', err.message);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // 에러 로그 테이블에 실패 사유 적재
      await ErrorLogModel.createLog({
        upload_type_cd: 'ACTIVATION',
        file_nm: originalFileName,
        err_cd: 'DB_EXECUTION_ERROR',
        err_msg: '개통 엑셀 일괄 저장 중 DB 예외 발생 및 트랜잭션 롤백',
        err_detail: {
          errorMessage: err.message,
          code: err.code,
          sqlState: err.sqlState,
          sqlMessage: err.sqlMessage
        },
        ip_addr: clientIp
      });

      return res.status(500).json({
        success: false,
        message: '해당 과정에서 문제가 발생했습니다. 관리자에게 문의해 주세요.'
      });
    }
  },

  /**
   * 개통 단건 삭제
   */
  async deleteActivation(req, res) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, message: 'ID가 필요합니다.' });
      }

      const result = await ActivationModel.deleteById(id);
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: '삭제할 데이터를 찾지 못했습니다.' });
      }

      return res.json({ success: true, message: '개통 이력 데이터가 삭제되었습니다.' });
    } catch (err) {
      console.error('개통 삭제 오류:', err);
      return res.status(500).json({ success: false, message: '삭제 처리 중 오류: ' + err.message });
    }
  },

  /**
   * 개통 전체 비우기
   */
  async clearAllActivations(req, res) {
    try {
      await ActivationModel.clearAllActivations();
      return res.json({ success: true, message: '전체 개통 이력이 성공적으로 초기화되었습니다.' });
    } catch (err) {
      console.error('개통 전체 삭제 오류:', err);
      return res.status(500).json({ success: false, message: '초기화 처리 중 오류: ' + err.message });
    }
  }
};

module.exports = activationController;
