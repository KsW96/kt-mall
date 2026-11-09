const fs = require('fs');
const UserModel = require('../models/userModel');
const SystemModel = require('../models/systemModel');
const ErrorLogModel = require('../models/errorLogModel');
const { scanRowsForInjection } = require('../utils/security');
const { parseUserExcel } = require('../utils/excelParser');
const db = require('../config/db');

const userController = {
  /**
   * 회원 목록 조회 페이지 렌더링
   */
  async getUserListPage(req, res) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const keyword = (req.query.keyword || '').trim();
      const searchType = (req.query.searchType || 'all').trim();
      const status = (req.query.status || '').trim();
      const startDate = (req.query.startDate || '').trim();
      const endDate = (req.query.endDate || '').trim();

      const result = await UserModel.findAll({ page, limit, keyword, searchType, status, startDate, endDate });
      const stats = await UserModel.getStats();
      const dbStatus = db.getDbStatus();

      res.render('users', {
        title: '회원 관리 (app_user)',
        activeMenu: 'users',
        baseUrl: '/users',
        items: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        },
        filters: { keyword, searchType, status, startDate, endDate },
        stats,
        dbStatus
      });
    } catch (err) {
      console.error('회원 목록 조회 에러:', err);
      res.status(500).send('회원 목록 로드 중 오류가 발생했습니다: ' + err.message);
    }
  },

  /**
   * 엑셀 파일 업로드 및 Bulk INSERT 처리 (보안 인젝션 검사 및 트랜잭션 롤백, 에러 로깅 연동)
   */
  async uploadExcel(req, res) {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '업로드할 엑셀 파일이 없습니다.' });
    }

    const filePath = req.file.path;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const originalFileName = req.file.originalname || 'unknown.xlsx';

    try {
      // 1. 엑셀 파일 파싱 및 데이터 전처리
      const parseResult = parseUserExcel(filePath);

      if (parseResult.formatMismatch) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return res.status(400).json({
          success: false,
          formatMismatch: true,
          errorType: 'FORMAT_MISMATCH',
          detectedType: parseResult.detectedType,
          detectedName: parseResult.detectedName,
          expectedType: parseResult.expectedType,
          expectedName: parseResult.expectedName,
          title: '엑셀 파일 포맷 불일치',
          message: parseResult.message,
          suggestion: parseResult.suggestion,
          detectedHeaders: parseResult.detectedHeaders || [],
          expectedColumns: parseResult.expectedColumns || []
        });
      }

      const { users, totalRows, errors } = parseResult;

      if (!users || users.length === 0) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return res.status(400).json({
          success: false,
          formatMismatch: true,
          errorType: 'EMPTY_OR_INVALID',
          title: '회원 데이터 없음',
          message: '유효한 회원 데이터 행을 찾을 수 없습니다. (고객 고유번호 un 확인 필요)',
          suggestion: '회원 엑셀 1열에 고객 고유번호(숫자)와 2열에 회원 이름이 입력되어 있는지 확인해 주세요.',
          detectedHeaders: parseResult.detectedHeaders || [],
          expectedColumns: ['1열: 고객고유번호 (un)', '2열: 이름 (nm)', '5열: 휴대폰번호 (phone)']
        });
      }

      // 2. SQL Injection 및 스크립트 인젝션 보안 사전 정밀 스캔
      const scanResult = scanRowsForInjection(users);
      if (scanResult.detected) {
        const v = scanResult.violation;
        console.warn(`🚨 [Security Alert] 회원 엑셀 업로드 중 보안 위협 감지: [${v.patternName}] 패턴 (행: ${v.rowNumber}, 컬럼: ${v.field})`);

        // 에러 로그 테이블(upload_error_log)에 기록 후 업로드 원천 차단
        await ErrorLogModel.createLog({
          upload_type_cd: 'USER',
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

        // 보안상 공격자에게 내부 상세를 노출하지 않고 관리자 문의 메시지 안내
        return res.status(400).json({
          success: false,
          message: '해당 과정에서 문제가 발생했습니다. 관리자에게 문의해 주세요.'
        });
      }

      // 3. MySQL 대량 삽입 / UPSERT (트랜잭션 실행)
      const result = await UserModel.bulkUpsertUsers(users);

      // sys_config에 회원정보 최근 업로드 일시 기록
      try {
        await SystemModel.recordUploadTime('MEMBER_EXCEL');
      } catch (metaErr) {
        console.warn('sys_config 최근 업로드 일시 갱신 실패:', metaErr.message);
      }

      // 4. 임시 파일 삭제
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return res.json({
        success: true,
        totalParsed: users.length,
        affectedRows: result.affectedRows,
        errors: errors.slice(0, 5),
        message: `총 ${users.length}건의 회원 데이터가 성공적으로 반영(등록/수정)되었습니다.`
      });
    } catch (err) {
      console.error('엑셀 업로드 처리 중 예외 발생:', err.message);

      // 임시 파일 삭제
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // 에러 로그 테이블에 실패 사유 적재
      await ErrorLogModel.createLog({
        upload_type_cd: 'USER',
        file_nm: originalFileName,
        err_cd: 'DB_EXECUTION_ERROR',
        err_msg: '회원 엑셀 일괄 저장(UPSERT) 처리 중 DB 예외 발생 및 트랜잭션 롤백',
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
   * 단건 회원 상세 조회
   */
  async getUserDetail(req, res) {
    try {
      const { un } = req.params;
      const user = await UserModel.findByUn(un);
      if (!user) {
        return res.status(404).json({ success: false, message: '회원 정보를 찾을 수 없습니다.' });
      }
      return res.json({ success: true, user });
    } catch (err) {
      console.error('회원 상세 조회 오류:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
   * 단건 회원 정보 수정
   */
  async updateUser(req, res) {
    try {
      const { un } = req.params;
      const { nm, birth_dt, phone, point, memo, approval_yn, status } = req.body;

      if (!nm || !nm.trim()) {
        return res.status(400).json({ success: false, message: '회원 이름은 필수입니다.' });
      }

      await UserModel.updateUser(un, {
        nm: nm.trim(),
        birth_dt: birth_dt || null,
        phone: phone || null,
        point: parseInt(point, 10) || 0,
        memo: memo || null,
        approval_yn: approval_yn || 'Y',
        status: status === 'O' ? 'O' : 'I'
      });

      return res.json({ success: true, message: `회원 [${nm}](고유번호: ${un}) 정보가 성공적으로 수정되었습니다.` });
    } catch (err) {
      console.error('회원 수정 오류:', err);
      return res.status(500).json({ success: false, message: '회원 정보 수정 실패: ' + err.message });
    }
  },

  /**
   * 단건 회원 삭제
   */
  async deleteUser(req, res) {
    try {
      const { un } = req.params;
      if (!un) {
        return res.status(400).json({ success: false, message: '고객 고유번호(un)가 필요합니다.' });
      }

      const result = await UserModel.deleteByUn(un);
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: '삭제할 회원을 찾지 못했습니다.' });
      }

      return res.json({ success: true, message: `회원(고유번호: ${un})이 성공적으로 삭제되었습니다.` });
    } catch (err) {
      console.error('회원 삭제 오류:', err);
      return res.status(500).json({ success: false, message: '삭제 처리 중 오류가 발생했습니다: ' + err.message });
    }
  },

  /**
   * 전체 회원 데이터 비우기 (TRUNCATE)
   */
  async clearAllUsers(req, res) {
    try {
      await UserModel.clearAllUsers();
      return res.json({ success: true, message: '전체 회원 데이터가 성공적으로 초기화(삭제)되었습니다.' });
    } catch (err) {
      console.error('전체 회원 삭제 오류:', err);
      return res.status(500).json({ success: false, message: '초기화 처리 중 오류가 발생했습니다: ' + err.message });
    }
  }
};

module.exports = userController;

