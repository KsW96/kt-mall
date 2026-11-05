const xlsx = require('xlsx');
const { ALL_80_COLUMNS } = require('../config/activationColumns');

/**
 * 전화번호 문자열을 '숫자-숫자-숫자' 표준 하이픈 패턴으로 변환 (언더바/공백/점 제거)
 */
function formatPhoneNumber(val) {
  if (!val) return null;
  // 숫자만 추출
  const digits = String(val).replace(/\D/g, '');
  if (!digits || digits.length < 7) {
    return String(val).trim() || null;
  }

  // 1. 11자리 (예: 01012345678 -> 010-1234-5678)
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  }

  // 2. 10자리 서울 국번 (예: 0212345678 -> 02-1234-5678)
  if (digits.length === 10 && digits.startsWith('02')) {
    return digits.replace(/(02)(\d{4})(\d{4})/, '$1-$2-$3');
  }

  // 3. 10자리 기타 지역/이동통신 (예: 0311234567 -> 031-123-4567)
  if (digits.length === 10) {
    return digits.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  }

  // 4. 9자리 서울 국번 (예: 021234567 -> 02-123-4567)
  if (digits.length === 9 && digits.startsWith('02')) {
    return digits.replace(/(02)(\d{3})(\d{4})/, '$1-$2-$3');
  }

  // 5. 8자리 전국대표번호 (예: 15881234 -> 1588-1234)
  if (digits.length === 8) {
    return digits.replace(/(\d{4})(\d{4})/, '$1-$2');
  }

  // 6. 12자리 안심번호/특수번호
  if (digits.length === 12) {
    return digits.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3');
  }

  // 7. 7자리 일반 번호
  if (digits.length === 7) {
    return digits.replace(/(\d{3})(\d{4})/, '$1-$2');
  }

  return digits;
}

/**
 * 날짜 문자열, 주민번호, 또는 엑셀 시리얼 번호를 앞 6자리 'YYMMDD' 형식으로 완벽 변환 (최대 6자리 보장)
 * (예: 1978년 01월 12일 -> 780112, 1995-05-20 -> 950520, 850512-1234567 -> 850512, 780112 -> 780112)
 */
function parseBirthDate(val) {
  if (val === null || val === undefined || val === '') return null;

  // 1. 엑셀 숫자 시리얼 값인 경우 (예: 28502)
  if (typeof val === 'number') {
    const dateObj = xlsx.SSF.parse_date_code(val);
    if (dateObj && dateObj.y && dateObj.m && dateObj.d) {
      const yy = String(dateObj.y).slice(-2);
      const m = String(dateObj.m).padStart(2, '0');
      const d = String(dateObj.d).padStart(2, '0');
      return `${yy}${m}${d}`;
    }
  }

  const str = String(val).trim();
  if (!str || str.startsWith('0000') || str === '000000' || str === '0') return null;

  // 2. 주민등록번호 패턴 (앞 6자리 - 뒤 1~7자리, 예: 850512-1234567, 850512-1******)
  const rrnMatch = str.match(/^(\d{6})\s*[-~_]\s*[\d*]{1,7}/);
  if (rrnMatch) {
    return rrnMatch[1];
  }

  // 3. 한글 날짜 형식 (예: "1978년 01월 12일", "78년 1월 12일")
  const koreanMatch = str.match(/(\d{2,4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (koreanMatch) {
    const yy = koreanMatch[1].slice(-2);
    const m = koreanMatch[2].padStart(2, '0');
    const d = koreanMatch[3].padStart(2, '0');
    return `${yy}${m}${d}`;
  }

  // 4. 일반 구분자 날짜 형식 (예: "1978-01-12", "1978.01.12", "1978/01/12", "1978-01-12 00:00:00")
  const dateMatch = str.match(/(\d{2,4})[-./\s]+(\d{1,2})[-./\s]+(\d{1,2})/);
  if (dateMatch) {
    const yy = dateMatch[1].slice(-2);
    const m = dateMatch[2].padStart(2, '0');
    const d = dateMatch[3].padStart(2, '0');
    return `${yy}${m}${d}`;
  }

  // 5. 순수 숫자만 추출하여 판별
  const digits = str.replace(/\D/g, '');
  if (!digits || digits === '000000' || digits.startsWith('0000')) return null;

  // 5-1. 정확히 6자리 (YYMMDD)
  if (digits.length === 6) {
    return digits;
  }

  // 5-2. 8자리 YYYYMMDD (예: 19850512, 20050315) -> 뒤 6자리 YYMMDD 추출
  if (digits.length === 8 && (digits.startsWith('19') || digits.startsWith('20') || digits.startsWith('18'))) {
    return digits.slice(2);
  }

  // 5-3. 13~14자리 주민등록번호 연속 숫자 (예: 8505121234567) -> 앞 6자리 추출
  if (digits.length >= 13) {
    return digits.slice(0, 6);
  }

  // 5-4. 8자리 초과 날짜시간 연속 숫자 (예: 19850512000000) -> 앞 8자리 중 뒤 6자리 추출
  if (digits.length >= 8 && (digits.startsWith('19') || digits.startsWith('20') || digits.startsWith('18'))) {
    return digits.slice(2, 8);
  }

  // 5-5. 그 외 6자리 이상이면 안전하게 앞 6자리 반환
  if (digits.length >= 6) {
    return digits.slice(0, 6);
  }

  return null;
}

/**
 * 개통일자(opening_dt)를 YYYY-MM-DD 형식으로 변환
 * - 엑셀 시리얼 번호 (예: 46323.73194, 46323, "46323.73194") 완벽 대응
 * - 날짜/시간 문자열 (예: "2026-10-28 17:34:00", "2026.10.28", "2026/10/28", "20261028") 대응
 * - 한글 날짜 문자열 (예: "2026년 10월 28일") 대응
 */
function parseOpeningDate(val) {
  if (val === null || val === undefined || val === '') return null;

  // 1. 숫자이거나 숫자로만 이루어진 문자열 (부동소수점 엑셀 시리얼 번호)
  const numVal = (typeof val === 'number') 
    ? val 
    : (typeof val === 'string' && /^\d+(\.\d+)?$/.test(val.trim()) && !/^\d{8}$/.test(val.trim()) ? parseFloat(val.trim()) : NaN);

  if (!isNaN(numVal) && numVal > 1000 && numVal < 100000) {
    const dateObj = xlsx.SSF.parse_date_code(numVal);
    if (dateObj && dateObj.y && dateObj.m && dateObj.d) {
      const y = String(dateObj.y);
      const m = String(dateObj.m).padStart(2, '0');
      const d = String(dateObj.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const str = String(val).trim();
  if (!str || str.startsWith('0000') || str === '0') return null;

  // 2. 8자리 YYYYMMDD (예: 20261028)
  const ymd8Match = str.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (ymd8Match) {
    return `${ymd8Match[1]}-${ymd8Match[2]}-${ymd8Match[3]}`;
  }

  // 3. 한글 날짜 형식 (예: 2026년 10월 28일)
  const koreanMatch = str.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (koreanMatch) {
    const y = koreanMatch[1];
    const m = koreanMatch[2].padStart(2, '0');
    const d = koreanMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 4. 일반 날짜 구분자 (예: 2026-10-28, 2026.10.28, 2026/10/28, 뒤에 시간 포함 가능)
  const dateMatch = str.match(/(\d{4})[-./\s]+(\d{1,2})[-./\s]+(\d{1,2})/);
  if (dateMatch) {
    const y = dateMatch[1];
    const m = dateMatch[2].padStart(2, '0');
    const d = dateMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
}

/**
 * 일시(DateTime) 파싱 (YYYY-MM-DD HH:mm:ss)
 * - 미접속/비정상 날짜('0000-00-00 00:00:00' 등)는 NULL로 안전하게 정제
 */
function parseDateTime(val) {
  if (!val) return null;

  if (typeof val === 'number') {
    const dateObj = xlsx.SSF.parse_date_code(val);
    if (dateObj) {
      const y = dateObj.y;
      if (y < 1900) return null; // 1900년 미만 비정상 날짜 필터링
      const m = String(dateObj.m).padStart(2, '0');
      const d = String(dateObj.d).padStart(2, '0');
      const H = String(dateObj.H || 0).padStart(2, '0');
      const M = String(dateObj.M || 0).padStart(2, '0');
      const S = String(dateObj.S || 0).padStart(2, '0');
      return `${y}-${m}-${d} ${H}:${M}:${S}`;
    }
  }

  const str = String(val).trim();
  if (!str || str.startsWith('0000') || str === '000000' || str === '0') return null;

  // '0000-00-00 00:00:00', '0000-00-00', '0' 등 0으로 채워진 미접속 레거시 날짜 필터링
  if (/^0{4}[-./]0{2}[-./]0{2}/.test(str) || str.startsWith('0000') || str === '0') {
    return null;
  }

  // "2026-10-29 06:54:26" 형식 대응
  const dtMatch = str.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2}):(\d{1,2}))?/);
  if (dtMatch) {
    const yNum = parseInt(dtMatch[1], 10);
    const mNum = parseInt(dtMatch[2], 10);
    const dNum = parseInt(dtMatch[3], 10);

    // 연도 1900년 미만, 0월, 0일 등 비정상 범위 필터링
    if (yNum < 1900 || mNum === 0 || mNum > 12 || dNum === 0 || dNum > 31) {
      return null;
    }

    const y = dtMatch[1];
    const m = String(mNum).padStart(2, '0');
    const d = String(dNum).padStart(2, '0');
    const H = (dtMatch[4] || '00').padStart(2, '0');
    const M = (dtMatch[5] || '00').padStart(2, '0');
    const S = (dtMatch[6] || '00').padStart(2, '0');
    return `${y}-${m}-${d} ${H}:${M}:${S}`;
  }

  return null;
}

/**
 * 엑셀 파일 버퍼 또는 파일 경로를 전달받아 app_user 규격으로 파싱
 */
function parseUserExcel(filePath) {
  const workbook = xlsx.readFile(filePath, { cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // 2차원 배열 형태로 시트 데이터 추출 (raw 모드)
  const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  const userMap = new Map();
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    // 1. 고객 고유번호 (un) 유효성 검사
    const rawUnStr = String(row[0] || '').trim();
    // 순수 숫자로만 구성되어 있는지 확인 (헤더 텍스트나 기호 섞인 행 필터링)
    if (!/^\d+$/.test(rawUnStr)) {
      continue; // 헤더 또는 잘못된 행 스킵
    }

    const un = parseInt(rawUnStr, 10);
    if (!un || un <= 0) {
      continue;
    }

    // 2. 이름 (nm) 유효성 검사
    let nm = String(row[1] || '').trim();
    // HTML 엔티티, 태그 기호, 특수기호 단독 또는 스크립트 파편 문자열 완벽 필터링
    const isInvalidName = !nm ||
      /[<>&"'+=;]/.test(nm) || // 이름에 태그/엔티티 기호 포함 불가
      nm.length < 1 ||
      nm.length > 50;

    if (isInvalidName) {
      errors.push({ row: i + 1, un, message: `이름(nm) 형식이 비정상적이어서 스킵되었습니다. [${nm}]` });
      continue;
    }

    // 3. 포인트: 천단위 콤마 제거 및 정수 파싱
    const rawPoint = String(row[2] || '0').replace(/,/g, '').trim();
    const point = parseInt(rawPoint, 10) || 0;

    // 4. 생년월일 파싱 (앞 6자리 YYMMDD)
    const birth_dt = parseBirthDate(row[3]);

    // 5. 휴대폰번호 정제 (숫자-숫자-숫자 표준 하이픈 패턴)
    const phone = formatPhoneNumber(row[4]);

    // 6. 메모
    const memo = String(row[5] || '').trim() || null;

    // 7. 가입일시 (없으면 현재 일시 기본값)
    const join_dt = parseDateTime(row[6]) || new Date().toISOString().slice(0, 19).replace('T', ' ');

    // 8. 최종접속일시
    const last_login_dt = parseDateTime(row[7]);

    // 9. 가입승인여부 (아홉 번째 컬럼, index 8)
    const rawApproval = String(row[8] || '').trim();
    const approval_yn = rawApproval || 'Y';

    // 10. 탈퇴 여부 (열 번째 컬럼, index 9)
    // 'O'이면 'O'(탈퇴), 그 외는 'I'(가입/정상)
    const rawStatus = String(row[9] || '').toUpperCase().trim();
    const status = (rawStatus === 'O') ? 'O' : 'I';

    // 중복 un이 엑셀 내에 존재하면 최신 행으로 덮어씀 (Map 활용)
    userMap.set(un, {
      un,
      nm,
      point,
      birth_dt,
      phone,
      memo,
      join_dt,
      last_login_dt,
      approval_yn,
      status
    });
  }

  const parsedUsers = Array.from(userMap.values());

  return {
    users: parsedUsers,
    totalRows: rows.length,
    errors
  };
}

/**
 * 개통이력(activation_log) 엑셀 파싱 함수 (80개 컬럼 전체 매핑 지원)
 */
function parseActivationExcel(filePath) {
  const workbook = xlsx.readFile(filePath, { cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  const parsedLogs = [];
  const errors = [];

  if (!rows || rows.length === 0) {
    return { logs: [], totalRows: 0, errors: [] };
  }

  // 1. 헤더 행 감지
  let startIndex = 0;
  const firstRow = rows[0] || [];
  const firstRowText = firstRow.map(c => String(c).trim()).join('|');

  // 컬럼 매핑 초기화 (기본: 80개 컬럼 인덱스 0~79 순서대로 매핑)
  const indexToField = ALL_80_COLUMNS.map(c => c.field);

  // 첫 번째 행이 헤더 텍스트인 경우 인덱스 매핑 확인
  if (firstRowText.includes('고객') || firstRowText.includes('관리코드') || firstRowText.includes('개통') || firstRowText.includes('번호')) {
    startIndex = 1; // 2번째 행부터 데이터

    // 헤더 중복 컬럼(예: '일련번호', '제품구분') 처리 카운터
    const headerUsageCount = {};
    firstRow.forEach((cell, cellIdx) => {
      const header = String(cell || '').replace(/\s+/g, '').toLowerCase();
      if (!header) return;

      headerUsageCount[header] = (headerUsageCount[header] || 0) + 1;
      const count = headerUsageCount[header];

      // ALL_80_COLUMNS에서 매칭 검색
      const matches = ALL_80_COLUMNS.filter(c => c.header.replace(/\s+/g, '').toLowerCase() === header);
      if (matches.length > 0) {
        const target = matches[count - 1] || matches[0];
        indexToField[cellIdx] = target.field;
      }
    });
  }

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    // 빈 행인지 체크 (모든 값이 비어있으면 스킵)
    const hasAnyValue = row.some(cell => String(cell || '').trim().length > 0);
    if (!hasAnyValue) continue;

    // 80개 모든 필드를 null로 초기화한 객체 생성
    const rowObj = {};
    ALL_80_COLUMNS.forEach(col => {
      rowObj[col.field] = null;
    });

    // 각 셀의 값 매핑
    row.forEach((cell, cellIdx) => {
      const field = indexToField[cellIdx];
      if (field) {
        let val = (cell === undefined || cell === null) ? null : String(cell).trim();
        if (val === '') val = null;
        rowObj[field] = val;
      }
    });

    // 판매처에 '(앱)'이 포함된 데이터는 제외 (업로드 스킵)
    const sellerNm = String(rowObj.seller_nm || '');
    const sellerNickNm = String(rowObj.seller_nick_nm || '');
    if (sellerNm.includes('(앱)') || sellerNickNm.includes('(앱)')) {
      continue;
    }

    // 개통일 날짜 정제 (반드시 YYYY-MM-DD 형식으로 변환)
    rowObj.opening_dt = parseOpeningDate(rowObj.opening_dt);

    // 생년월일 날짜 정제 (반드시 앞 6자리 YYMMDD로 정규화, 실패 시 null 설정하여 6자리 초과 에러 원천 차단)
    const parsedBirth = parseBirthDate(rowObj.birth_dt);
    rowObj.birth_dt = parsedBirth ? (parsedBirth.length > 6 ? parsedBirth.slice(0, 6) : parsedBirth) : null;

    // 개통번호 정제 (숫자-숫자-숫자 표준 하이픈 패턴)
    if (rowObj.phone_num) {
      rowObj.phone_num = formatPhoneNumber(rowObj.phone_num);
    }

    parsedLogs.push(rowObj);
  }

  return {
    logs: parsedLogs,
    totalRows: rows.length - startIndex,
    errors
  };
}

module.exports = {
  parseUserExcel,
  parseActivationExcel,
  parseBirthDate,
  parseOpeningDate,
  parseDateTime,
  formatPhoneNumber
};

