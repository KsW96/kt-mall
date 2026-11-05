// 실제 DB가 없을 때 사용할 시드/Mock 데이터셋
const initialData = [
  { id: 1, code: 'ORD-2026-001', title: '고성능 무선 게이밍 마우스', category: 'IT/전자기기', amount: 89000, status: 'COMPLETED', customer: '김철수', createdAt: '2026-10-27 10:15:00', notes: '당일 출고 완료' },
  { id: 2, code: 'ORD-2026-002', title: '인체공학 메시 사무용 의자', category: '가구/인테리어', amount: 245000, status: 'PENDING', customer: '이영희', createdAt: '2026-10-27 09:30:00', notes: '결제 승인 대기' },
  { id: 3, code: 'ORD-2026-003', title: '울트라 와이드 모니터 34인치', category: 'IT/전자기기', amount: 620000, status: 'COMPLETED', customer: '박민준', createdAt: '2026-10-26 18:20:00', notes: '설치 배송 요청' },
  { id: 4, code: 'ORD-2026-004', title: '프리미엄 캡슐 커피 머신', category: '생활가전', amount: 159000, status: 'CANCELLED', customer: '최수진', createdAt: '2026-10-26 15:45:00', notes: '단순 변심 취소' },
  { id: 5, code: 'ORD-2026-005', title: '노이즈 캔슬링 블루투스 헤드폰', category: 'IT/전자기기', amount: 389000, status: 'COMPLETED', customer: '정도현', createdAt: '2026-10-25 14:10:00', notes: '사은품 케이스 동봉' },
  { id: 6, code: 'ORD-2026-006', title: '친환경 대나무 키보드 팜레스트', category: '사무용품', amount: 29000, status: 'COMPLETED', customer: '한지민', createdAt: '2026-10-25 11:05:00', notes: '일반 택배 배송' },
  { id: 7, code: 'ORD-2026-007', title: '스마트 LED 무드등 스피커', category: '생활가전', amount: 78000, status: 'PENDING', customer: '강동원', createdAt: '2026-10-24 16:50:00', notes: '재고 확인 중' },
  { id: 8, code: 'ORD-2026-008', title: '전동 높이조절 모션 데스크', category: '가구/인테리어', amount: 490000, status: 'COMPLETED', customer: '윤아라', createdAt: '2026-10-24 13:22:00', notes: '방문 설치 완료' },
  { id: 9, code: 'ORD-2026-009', title: '4K 웹캠 및 지향성 마이크 세트', category: 'IT/전자기기', amount: 198000, status: 'COMPLETED', customer: '송중기', createdAt: '2026-10-23 17:35:00', notes: '스트리머 화상회의용' },
  { id: 10, code: 'ORD-2026-010', title: '알루미늄 랩탑 거치대', category: '사무용품', amount: 45000, status: 'COMPLETED', customer: '이지은', createdAt: '2026-10-23 10:11:00', notes: '익일 배송 완료' },
  { id: 11, code: 'ORD-2026-011', title: '초경량 기계식 커스텀 키보드', category: 'IT/전자기기', amount: 185000, status: 'PENDING', customer: '박보검', createdAt: '2026-10-22 19:40:00', notes: '스위치 교체 옵션' },
  { id: 12, code: 'ORD-2026-012', title: '공기청정기 필터 세트', category: '생활가전', amount: 64000, status: 'COMPLETED', customer: '김태리', createdAt: '2026-10-22 15:20:00', notes: '정기 구독 배송' },
  { id: 13, code: 'ORD-2026-013', title: '대용량 보조배터리 20,000mAh', category: 'IT/전자기기', amount: 52000, status: 'CANCELLED', customer: '유재석', createdAt: '2026-10-21 12:00:00', notes: '중복 주문으로 인한 취소' },
  { id: 14, code: 'ORD-2026-014', title: '자석 부착형 모니터 조명 바', category: '생활가전', amount: 89000, status: 'COMPLETED', customer: '조인성', createdAt: '2026-10-21 09:15:00', notes: '시력 보호 조명' },
  { id: 15, code: 'ORD-2026-015', title: '멀티 고속 충전 스테이션 120W', category: 'IT/전자기기', amount: 99000, status: 'COMPLETED', customer: '손흥민', createdAt: '2026-10-20 16:30:00', notes: '해외 배송' }
];

let mockItems = [...initialData];

module.exports = {
  getMockData: () => mockItems,
  addMockItem: (item) => {
    const nextId = mockItems.length > 0 ? Math.max(...mockItems.map(d => d.id)) + 1 : 1;
    const newItem = {
      id: nextId,
      code: `ORD-2026-${String(nextId).padStart(3, '0')}`,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      ...item
    };
    mockItems.unshift(newItem);
    return newItem;
  },
  resetMockData: () => {
    mockItems = [...initialData];
  }
};

