/**
 * 개인정보 마스킹 및 수치 계산 유틸리티
 */

/**
 * 고객명 마스킹 함수
 * - 한글 성명: 2번째 글자 마스킹 (예: 홍길동 -> 홍*동, 김철 -> 김*, 남궁민수 -> 남*민수)
 * - 외국인/영문 성명: 공백/구분자 기준 각 단어의 2번째 글자 마스킹 (예: JOHN DOE -> J*HN D*E, Michael -> M*chael)
 * - 콤마/하이픈 포함 외국인 성명: DOE, JOHN -> D*E, J*HN, Jean-Luc -> J*an-L*c
 * - 1글자: 마스킹 없이 반환
 */
function maskCustomerName(name) {
  if (!name || typeof name !== 'string') return '-';
  const trimmed = name.trim();
  if (!trimmed) return '-';

  // 단어 단위(영문, 한글, 숫자 연속체)를 추출하여 단어별 2번째 글자 마스킹
  return trimmed.replace(/[A-Za-z가-힣0-9]+/g, (word) => {
    if (word.length <= 1) return word;
    if (word.length === 2) {
      return word[0] + '*';
    }
    // 3글자 이상: 2번째 문자만 '*'로 치환 (나머지 뒤 문자는 그대로 유지)
    return word[0] + '*' + word.slice(2);
  });
}

/**
 * 금액 문자열을 정수로 변환 (콤마, 원, 공백 등 비숫자 기호 제거)
 */
function parseMoney(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return Math.floor(val);
  const numStr = String(val).replace(/[^0-9-]/g, '');
  return parseInt(numStr, 10) || 0;
}

/**
 * 최종할부원금 계산: 출고가 - 공통지원금 - 추가지원금
 */
function calculateFinalPrincipal(factoryPrice, commonSubsidy, addSubsidy) {
  const fp = parseMoney(factoryPrice);
  const cs = parseMoney(commonSubsidy);
  const as = parseMoney(addSubsidy);
  return fp - cs - as;
}

module.exports = {
  maskCustomerName,
  parseMoney,
  calculateFinalPrincipal
};

