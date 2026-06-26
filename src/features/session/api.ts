import { ref, set, update, get } from 'firebase/database';
import { signInAnonymously } from 'firebase/auth';
import { auth, db } from '@/firebase/app';
import { paths } from '@/firebase/paths';
import type {
  GradeBand,
  Group,
  GroupAssignMode,
  Phase,
  SessionContent,
  SessionMeta,
  SessionState,
} from '@/models';
import { DEFAULT_PROMPTS } from '@/content/prompts';
import { DEFAULT_PROLOGUE } from '@/content/prologue';

// 혼동되는 글자(I, O, 0, 1) 제외
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateCode(len = 6): string {
  const arr = crypto.getRandomValues(new Uint32Array(len));
  let out = '';
  for (let i = 0; i < len; i++) out += CODE_CHARS[arr[i] % CODE_CHARS.length];
  return out;
}

export const PHASE_ORDER: Phase[] = [
  'lobby',
  'prologue',
  'gallery',
  'branch',
  'auction',
  'result',
];

export const PHASE_LABELS: Record<Phase, string> = {
  lobby: '로비 (대기)',
  prologue: '프롤로그',
  gallery: '공통회랑',
  branch: '회랑 분기',
  auction: '경매장',
  result: '결과 발표',
};

export function nextPhase(p: Phase): Phase {
  const i = PHASE_ORDER.indexOf(p);
  return PHASE_ORDER[Math.min(i + 1, PHASE_ORDER.length - 1)];
}

export function prevPhase(p: Phase): Phase {
  const i = PHASE_ORDER.indexOf(p);
  return PHASE_ORDER[Math.max(i - 1, 0)];
}

export interface CreateSessionParams {
  gradeBand: GradeBand;
  startingFunds: number;
  minIncrement: number;
  timerSeconds: number;
  commonGalleryCount: number;
  branchDoorCount: number;
  groupCount: number;
  groupAssignMode?: GroupAssignMode;
}

/** 세션 생성 → 코드 발급. meta/state/content 시드 기록. 교사 익명 인증. */
export async function createSession(params: CreateSessionParams): Promise<string> {
  const cred = await signInAnonymously(auth);
  const code = generateCode();

  const meta: SessionMeta = {
    code,
    teacherUid: cred.user.uid,
    gradeBand: params.gradeBand,
    startingFunds: params.startingFunds,
    minIncrement: params.minIncrement,
    timerSeconds: params.timerSeconds,
    commonGalleryCount: params.commonGalleryCount,
    branchDoorCount: params.branchDoorCount,
    groupAssignMode: params.groupAssignMode ?? 'preset',
    groupCount: params.groupCount,
    createdAt: Date.now(),
  };
  const state: SessionState = { phase: 'lobby' };
  const content: SessionContent = {
    prologue: DEFAULT_PROLOGUE[params.gradeBand],
    prompts: DEFAULT_PROMPTS[params.gradeBand],
  };

  // 모둠 자동 생성 (모두 동일 시작 자금)
  const groups: Record<string, Group> = {};
  for (let i = 1; i <= params.groupCount; i++) {
    const id = `g${i}`;
    groups[id] = {
      id,
      name: `${i}모둠`,
      remainingBudget: params.startingFunds,
      wonItems: {},
    };
  }

  await set(ref(db, paths.session(code)), { meta, state, content, groups });
  return code;
}

export async function sessionExists(code: string): Promise<boolean> {
  const snap = await get(ref(db, paths.meta(code)));
  return snap.exists();
}

/** 교사 단계 전환 (source of truth). */
export async function setPhase(code: string, phase: Phase): Promise<void> {
  await update(ref(db, paths.state(code)), { phase });
}

/** 교사 콘텐츠(프롤로그·발문) 편집 저장. */
export async function saveContent(code: string, content: SessionContent): Promise<void> {
  await set(ref(db, paths.content(code)), content);
}
