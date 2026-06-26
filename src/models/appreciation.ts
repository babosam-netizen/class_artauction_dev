import type { Timestamp } from './common';

export interface Appreciation {
  studentNumber: string;
  artworkId: string;
  answers: string[]; // 발문 개수에 대응 (가변)
  submittedAt: Timestamp;
  updatedAt: Timestamp;
}
