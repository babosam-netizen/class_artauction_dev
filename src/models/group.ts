import type { Won } from './common';

export interface Group {
  id: string;
  name: string;
  repStudentNumber?: string;
  remainingBudget: Won; // 시작자금 − 낙찰 지불가 합
  wonItems: Record<string /* artworkId */, Won /* 지불가 */>;
}
