import type { Timestamp } from './common';

export interface Student {
  number: string; // 세션 내 고유, RTDB 키
  name: string;
  groupId: string;
  isRep: boolean;
  uid: string; // 익명 인증 uid (재접속 인계)
  joinedAt: Timestamp;
  lastSeenAt: Timestamp;
}
