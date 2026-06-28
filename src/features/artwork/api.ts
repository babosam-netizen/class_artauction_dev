import { ref, push, set, remove, update } from 'firebase/database';
import { db } from '@/firebase/app';
import { paths } from '@/firebase/paths';
import type { Artwork, Placement } from '@/models';

/** 작품 일부 필드 수정 (감정가·해설·제목·배치·경매대상 등). */
export async function updateArtwork(
  code: string,
  id: string,
  patch: Partial<Artwork>,
): Promise<void> {
  await update(ref(db, paths.artwork(code, id)), patch);
}

export interface ArtworkInput {
  imageUrl: string;
  title: string;
  source: string;
  appraisedValue: number;
  commentary: string;
  placement: Placement;
  forAuction: boolean;
}

export async function addArtwork(
  code: string,
  input: ArtworkInput,
  order: number,
): Promise<string> {
  const newRef = push(ref(db, paths.artworks(code)));
  const id = newRef.key!;
  const artwork: Artwork = { id, order, ...input };
  await set(newRef, artwork);
  return id;
}

export async function removeArtwork(code: string, id: string): Promise<void> {
  await remove(ref(db, paths.artwork(code, id)));
}

/** 배치 라벨 (공통회랑 / 분기 N) */
export function placementLabel(p: Placement): string {
  return p.kind === 'common' ? '공통작품감상실' : '선택작품감상실';
}

export function sortByOrder<T extends { order: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order);
}
