import type { Won } from './common';

export type AuctionStatus = 'pending' | 'live' | 'sold' | 'passed'; // 대기/진행/낙찰/유찰

export interface AuctionItem {
  artworkId: string;
  status: AuctionStatus;
  askingPrice: Won; // 현재 호가
  participants?: Record<string, boolean>; // 참여(사겠다) 중인 모둠
  winnerGroupId?: string; // 낙찰 모둠
  order: number; // 랜덤 셔플된 등장 순서
}
