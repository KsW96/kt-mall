/**
 * 날짜 및 일시 표준 포맷터
 */

function pad(n) {
  return String(n).padStart(2, '0');
}

/**
 * YYYY-MM-DD HH:mm:ss 형식 변환
 */
function formatDateTime(val) {
  if (!val) return '-';

  // 1. 이미 'YYYY-MM-DD HH:mm:ss' 형식의 문자열인 경우 그대로 반환
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    // 'YYYY-MM-DDTHH:mm:ss.sssZ' ISO 문자열
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
    return trimmed;
  }

  // 2. Date 객체인 경우
  if (val instanceof Date && !isNaN(val.getTime())) {
    return `${val.getFullYear()}-${pad(val.getMonth() + 1)}-${pad(val.getDate())} ${pad(val.getHours())}:${pad(val.getMinutes())}:${pad(val.getSeconds())}`;
  }

  return String(val);
}

/**
 * YYYY-MM-DD 날짜 형식 변환
 */
function formatDate(val) {
  if (!val) return '-';

  if (typeof val === 'string') {
    const trimmed = val.trim();
    // 6자리 YYMMDD 생년월일은 그대로 반환
    if (/^\d{6}$/.test(trimmed)) {
      return trimmed;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
    return trimmed.slice(0, 10);
  }

  if (val instanceof Date && !isNaN(val.getTime())) {
    return `${val.getFullYear()}-${pad(val.getMonth() + 1)}-${pad(val.getDate())}`;
  }

  return String(val);
}

module.exports = {
  formatDateTime,
  formatDate
};

