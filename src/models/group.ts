import type { Won } from './common';

export interface Group {
  id: string;
  name: string;
  repStudentNumber?: string;
  remainingBudget: Won; // 시작자금 + 감상 사례금 − 낙찰 지불가 합
  rewardTotal?: Won; // 감상 사례금으로 유입된 누적 금액 (기본자금과 구분 표시용)
  wonItems: Record<string /* artworkId */, Won /* 지불가 */>;
}
