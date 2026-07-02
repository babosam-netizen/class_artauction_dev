import { ref, get, set } from 'firebase/database';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth, db } from '@/firebase/app';

// 전역 교사 암호(소프트 게이트). 최초 설정값이 write-once 규칙으로 고정됨.
const PATH = 'teacherAuth';
const SALT = 'art-auction::v1::';

// ── 공용 교사 계정 (역할 기반 접근제어) ──────────────────────────────────────
// 교사는 이 하나의 계정으로 로그인한다. 규칙은 "이메일 있는 계정 = 교사"로 보고
// 어느 세션이든 편집을 허용한다(학생은 익명이라 이메일이 없음).
// 짧은 교사 암호를 Firebase 최소 6자 규정에 맞추려 공개 접미사를 붙인다.
// 접미사는 번들에 노출돼도 무의미 — 진짜 비밀은 교사가 입력하는 암호다.
const TEACHER_EMAIL = 'teacher@art-auction.app';
const PW_SUFFIX = '::art-auction-teacher-v1';
const accountPw = (pw: string): string => pw + PW_SUFFIX;

/** 교사 공용 계정으로 로그인. 성공하면 이 기기는 교사 역할(어느 세션이든 편집 가능). */
export async function signInAsTeacher(pw: string): Promise<boolean> {
  try {
    await signInWithEmailAndPassword(auth, TEACHER_EMAIL, accountPw(pw));
    return true;
  } catch {
    return false;
  }
}

/** 교사 계정이 아직 없으면 만든다(마이그레이션·최초 설정용). 이미 있으면 조용히 무시. */
export async function ensureTeacherAccount(pw: string): Promise<void> {
  try {
    await createUserWithEmailAndPassword(auth, TEACHER_EMAIL, accountPw(pw));
  } catch {
    // email-already-in-use 등 → 이미 존재. 무시.
  }
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function teacherPasswordExists(): Promise<boolean> {
  const snap = await get(ref(db, PATH));
  return snap.exists();
}

/** 최초 1회 설정. 규칙상 이미 있으면 거부됨. */
export async function setTeacherPassword(pw: string): Promise<void> {
  const hash = await sha256(SALT + pw);
  await set(ref(db, PATH), { hash, createdAt: Date.now() });
}

export async function verifyTeacherPassword(pw: string): Promise<boolean> {
  const snap = await get(ref(db, PATH));
  if (!snap.exists()) return false;
  const hash = await sha256(SALT + pw);
  return (snap.val() as { hash: string }).hash === hash;
}

const UNLOCK_KEY = 'teacherUnlocked';
export const isUnlocked = (): boolean => sessionStorage.getItem(UNLOCK_KEY) === '1';
export const markUnlocked = (): void => sessionStorage.setItem(UNLOCK_KEY, '1');
