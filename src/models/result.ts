import type { Won } from './common';

export interface GroupResult {
  groupId: string;
  remainingCash: Won;
  wonAppraisedSum: Won; // 낙찰작 감정가 합
  asset: Won; // remainingCash + wonAppraisedSum
  rank: number;
}
