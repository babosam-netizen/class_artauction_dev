import type { GradeBand, GroupAssignMode, Phase, Timestamp, Won } from './common';

export interface SessionMeta {
  code: string;
  teacherUid: string;
  gradeBand: GradeBand;
  startingFunds: Won;
  minIncrement: Won;
  timerSeconds: number;
  commonGalleryCount: number; // 1~3
  branchDoorCount: number;
  groupAssignMode: GroupAssignMode;
  groupCount: number;
  groupSize: number; // 모둠당 정원
  createdAt: Timestamp;
}

export interface SessionState {
  phase: Phase;
  currentAuctionArtworkId?: string;
}

/** 교사 편집 가능 콘텐츠 (학년군 기본값으로 시드, 가변) */
export interface SessionContent {
  prologue: string[];
  prompts: string[];
}
