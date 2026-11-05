/**
 * SQL Injection 및 스크립트 인젝션 탐지 유틸리티
 */

// SQL Injection 공격 패턴 목록
const SQLI_PATTERNS = [
  {
    name: 'UNION_SELECT',
    regex: /\bunion\s+(all\s+)?select\b/i
  },
  {
    name: 'BOOLEAN_BASED_OR_AND',
    regex: /('\s*(or|and)\s+['"\w\d]+\s*=\s*['"\w\d]+)/i
  },
  {
    name: 'STACKED_QUERIES',
    regex: /('\s*;\s*(drop|delete|update|insert|alter|truncate|create|grant|revoke|exec|execute)\b)/i
  },
  {
    name: 'SQL_COMMENT_TRICK',
    regex: /('\s*--|\/\*.*?\*\/|;\s*--)/
  },
  {
    name: 'TIME_BASED_BLIND',
    regex: /\b(sleep|benchmark)\s*\(\s*\d+\s*\)/i
  },
  {
    name: 'WAITFOR_DELAY',
    regex: /\bwaitfor\s+delay\s+['"]/i
  },
  {
    name: 'ERROR_BASED_XPATH',
    regex: /\b(extractvalue|updatexml)\s*\(/i
  },
  {
    name: 'COMMAND_EXECUTION',
    regex: /\b(xp_cmdshell|sys_eval)\b/i
  }
];

// 악성 스크립트(XSS) 인젝션 패턴 목록
const SCRIPT_PATTERNS = [
  {
    name: 'SCRIPT_TAG',
    regex: /<\s*script\b[^>]*>/i
  },
  {
    name: 'JAVASCRIPT_URI',
    regex: /javascript\s*:\s*/i
  },
  {
    name: 'EVENT_HANDLER_ATTR',
    regex: /on(error|load|click|mouseover|submit|focus)\s*=/i
  },
  {
    name: 'IFRAME_TAG',
    regex: /<\s*iframe\b[^>]*>/i
  }
];

/**
 * 단일 문자열 값에 대한 인젝션 검사
 * @param {string} val
 * @returns {object|null} 인젝션 감지 시 { type, patternName, match } 반환, 정상이면 null
 */
function testValueForInjection(val) {
  if (val === null || val === undefined) return null;
  const str = String(val);
  if (str.length === 0) return null;

  // 1. SQL Injection 검사
  for (const p of SQLI_PATTERNS) {
    const match = str.match(p.regex);
    if (match) {
      return {
        type: 'SQL_INJECTION',
        patternName: p.name,
        match: match[0],
        snippet: str.length > 100 ? str.slice(0, 100) + '...' : str
      };
    }
  }

  // 2. Script Injection 검사
  for (const p of SCRIPT_PATTERNS) {
    const match = str.match(p.regex);
    if (match) {
      return {
        type: 'SCRIPT_INJECTION',
        patternName: p.name,
        match: match[0],
        snippet: str.length > 100 ? str.slice(0, 100) + '...' : str
      };
    }
  }

  return null;
}

/**
 * 행(Object) 단위 인젝션 검사
 * @param {object} rowData - 단일 행 데이터 객체
 * @param {number} rowNumber - 행 번호 (1부터 시작)
 * @returns {object|null}
 */
function detectInjectionInRow(rowData, rowNumber = 0) {
  if (!rowData || typeof rowData !== 'object') return null;

  for (const [key, value] of Object.entries(rowData)) {
    const check = testValueForInjection(value);
    if (check) {
      return {
        rowNumber,
        field: key,
        value: String(value),
        ...check
      };
    }
  }

  return null;
}

/**
 * 엑셀 파싱된 전체 행 리스트 인젝션 정밀 검사
 * @param {Array<object>} rows - 파싱된 행 데이터 배열
 * @returns {{ detected: boolean, violation: object|null }}
 */
function scanRowsForInjection(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { detected: false, violation: null };
  }

  for (let i = 0; i < rows.length; i++) {
    const violation = detectInjectionInRow(rows[i], i + 1);
    if (violation) {
      return {
        detected: true,
        violation
      };
    }
  }

  return { detected: false, violation: null };
}

module.exports = {
  testValueForInjection,
  detectInjectionInRow,
  scanRowsForInjection
};

