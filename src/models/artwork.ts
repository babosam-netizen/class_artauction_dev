import type { Won } from './common';

export type Placement = { kind: 'common' } | { kind: 'branch'; door: number };

export interface Artwork {
  id: string;
  imageUrl: string;
  title: string;
  source: string; // 결과 전 비표시
  appraisedValue: Won; // 결과 전 비표시
  commentary: string; // 감상 직후 표시
  placement: Placement;
  forAuction: boolean;
  order: number;
}
