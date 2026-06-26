import type { Timestamp, Won } from './common';

export type AuctionStatus = 'pending' | 'live' | 'sold' | 'passed'; // 대기/진행/낙찰/유찰
export type TimerState = 'idle' | 'running';

export interface AuctionItem {
  artworkId: string;
  status: AuctionStatus;
  currentPrice: Won; // 시작 0, 첫 호가는 최소 호가 단위 이상
  highBidGroupId?: string;
  timerState: TimerState;
  timerEndsAt?: Timestamp;
  order: number; // 랜덤 셔플된 등장 순서
}

export interface Bid {
  id: string;
  artworkId: string;
  groupId: string;
  amount: Won;
  at: Timestamp;
}
