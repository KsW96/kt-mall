const db = require('../config/db');

// In-Memory Fallback용 Mock 로그 배열
const mockErrorLogs = [];

const ErrorLogModel = {
  /**
   * 업로드 에러 및 보안 인젝션 시도 로그 적재
   * @param {Object} param0
   * @param {string} param0.upload_type_cd - 'USER' 또는 'ACTIVATION'
   * @param {string} param0.file_nm - 업로드된 원본 파일명
   * @param {string} param0.err_cd - 에러 코드 (SQL_INJECTION, DB_ERROR 등)
   * @param {string} param0.err_msg - 에러 메시지 요약
   * @param {string|object} param0.err_detail - 위험 페이로드, 행 번호 또는 스택 트레이스
   * @param {string} param0.ip_addr - 요청자 IP 주소
   */
  async createLog({ upload_type_cd, file_nm, err_cd, err_msg, err_detail, ip_addr }) {
    const detailStr = typeof err_detail === 'object' ? JSON.stringify(err_detail, null, 2) : String(err_detail || '');

    // 1. MySQL 연결 모드
    if (db.getDbStatus().connected) {
      try {
        const sql = `
          INSERT INTO upload_error_log (
            upload_type_cd, file_nm, err_cd, err_msg, err_detail, ip_addr, created_dt
          ) VALUES (?, ?, ?, ?, ?, ?, NOW())
        `;
        const [result] = await db.query(sql, [
          upload_type_cd || 'UNKNOWN',
          file_nm || null,
          err_cd || 'ERROR',
          err_msg || '알 수 없는 오류',
          detailStr || null,
          ip_addr || null
        ]);
        return { success: true, logId: result.insertId };
      } catch (dbErr) {
        console.error('❌ [ErrorLogModel] MySQL 로그 적재 실패:', dbErr.message);
      }
    }

    // 2. Mock Fallback 모드
    const newLog = {
      id: mockErrorLogs.length + 1,
      upload_type_cd: upload_type_cd || 'UNKNOWN',
      file_nm: file_nm || null,
      err_cd: err_cd || 'ERROR',
      err_msg: err_msg || '알 수 없는 오류',
      err_detail: detailStr || null,
      ip_addr: ip_addr || null,
      created_dt: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };
    mockErrorLogs.push(newLog);
    return { success: true, logId: newLog.id };
  },

  /**
   * 최근 발생한 에러 로그 목록 조회
   */
  async getRecentLogs(limit = 20) {
    if (db.getDbStatus().connected) {
      try {
        const [rows] = await db.query(
          `SELECT 
             id, upload_type_cd, file_nm, err_cd, err_msg, err_detail, ip_addr,
             DATE_FORMAT(created_dt, '%Y-%m-%d %H:%i:%s') AS created_dt
           FROM upload_error_log
           ORDER BY id DESC
           LIMIT ?`,
          [parseInt(limit, 10)]
        );
        return rows;
      } catch (err) {
        console.error('❌ [ErrorLogModel.getRecentLogs] 조회 실패:', err.message);
      }
    }
    return mockErrorLogs.slice(-limit).reverse();
  }
};

module.exports = ErrorLogModel;

