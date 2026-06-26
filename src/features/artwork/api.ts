import { ref, push, set, remove } from 'firebase/database';
import { db } from '@/firebase/app';
import { paths } from '@/firebase/paths';
import type { Artwork, Placement } from '@/models';

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
  return p.kind === 'common' ? '공통회랑' : `분기 ${p.door + 1}번 문`;
}

export function sortByOrder<T extends { order: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order);
}
