import type { AuctionMode, GradeBand, GroupAssignMode, Phase, Timestamp, Won } from './common';

export interface SessionMeta {
  code: string;
  teacherUid: string;
  className?: string; // 반 이름 (예: 6학년 9반)
  teacherName?: string; // 교사 이름
  gradeBand: GradeBand;
  startingFunds: Won;
  minIncrement: Won;
  timerSeconds: number;
  commonGalleryCount: number; // 1~3
  branchDoorCount: number;
  groupAssignMode: GroupAssignMode;
  groupCount: number;
  groupSize: number; // 모둠당 정원
  showCommonTitles?: boolean; // 공통작품감상실에서 작품 이름 표시 여부 (교사 설정)
  auctionMode?: AuctionMode; // 경매 방식 (기본 live)
  createdAt: Timestamp;
}

export interface SessionState {
  phase: Phase;
  currentAuctionArtworkId?: string;
  revealValues?: boolean; // 결과 발표: 교사가 감정가·순위 공개 토글
}

/** 교사 편집 가능 콘텐츠 (학년군 기본값으로 시드, 가변) */
export interface SessionContent {
  prologue: string[];
  prompts: string[];
}
