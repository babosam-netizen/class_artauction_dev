import type { Phase, Timestamp } from './common';

/** 학생의 현재 위치(현황판 표시용) */
export interface StudentLocation {
  phase: Phase;
  detail?: string; // 예: 보고 있는 작품명
  at: Timestamp;
}

export interface Student {
  number: string; // 세션 내 고유, RTDB 키
  name: string;
  groupId: string;
  isRep: boolean;
  uid: string; // 익명 인증 uid (재접속 인계)
  joinedAt: Timestamp;
  lastSeenAt: Timestamp;
  current?: StudentLocation;
}
