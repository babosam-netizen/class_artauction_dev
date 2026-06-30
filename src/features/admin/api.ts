import { ref, get, set } from 'firebase/database';
import { db } from '@/firebase/app';

// 전역 슈퍼어드민 암호(소프트 게이트). 최초 설정값이 write-once 규칙으로 고정됨.
// 모든 세션을 한눈에 보는 단일 관리자 계정. (teacherAuth 와 별개)
const PATH = 'adminAuth';
const SALT = 'art-auction::admin::v1::';

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function adminPasswordExists(): Promise<boolean> {
  const snap = await get(ref(db, PATH));
  return snap.exists();
}

/** 최초 1회 설정. 규칙상 이미 있으면 거부됨. */
export async function setAdminPassword(pw: string): Promise<void> {
  const hash = await sha256(SALT + pw);
  await set(ref(db, PATH), { hash, createdAt: Date.now() });
}

export async function verifyAdminPassword(pw: string): Promise<boolean> {
  const snap = await get(ref(db, PATH));
  if (!snap.exists()) return false;
  const hash = await sha256(SALT + pw);
  return (snap.val() as { hash: string }).hash === hash;
}

const UNLOCK_KEY = 'adminUnlocked';
export const isAdminUnlocked = (): boolean => sessionStorage.getItem(UNLOCK_KEY) === '1';
export const markAdminUnlocked = (): void => sessionStorage.setItem(UNLOCK_KEY, '1');
export const clearAdminUnlocked = (): void => sessionStorage.removeItem(UNLOCK_KEY);
