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

// 프롤로그가 첫 단계 (입장 직후 바로 서사). lobby는 레거시(순서에서 제외).
export const PHASE_ORDER: Phase[] = ['prologue', 'gallery', 'branch', 'auction', 'result'];

export const PHASE_LABELS: Record<Phase, string> = {
  lobby: '로비 (대기)',
  prologue: '프롤로그',
  gallery: '공통작품감상실',
  branch: '선택작품감상실',
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
  className: string;
  teacherName: string;
  gradeBand: GradeBand;
  startingFunds: number;
  minIncrement: number;
  timerSeconds: number;
  commonGalleryCount: number;
  branchDoorCount: number;
  groupCount: number;
  groupSize: number;
  groupAssignMode?: GroupAssignMode;
}

/** 세션 생성 → 코드 발급. meta/state/content 시드 기록. */
export async function createSession(params: CreateSessionParams): Promise<string> {
  // 이미 로그인돼 있으면(교사 계정 등) 그 uid를 소유자로. 없을 때만 익명 로그인.
  // (교사 계정으로 만들 때 익명으로 강등되지 않도록)
  const uid = auth.currentUser?.uid ?? (await signInAnonymously(auth)).user.uid;
  const code = generateCode();

  const meta: SessionMeta = {
    code,
    teacherUid: uid,
    className: params.className.trim(),
    teacherName: params.teacherName.trim(),
    gradeBand: params.gradeBand,
    startingFunds: params.startingFunds,
    minIncrement: params.minIncrement,
    timerSeconds: params.timerSeconds,
    commonGalleryCount: params.commonGalleryCount,
    branchDoorCount: params.branchDoorCount,
    branchPickLimit: 1,
    groupAssignMode: params.groupAssignMode ?? 'preset',
    groupCount: params.groupCount,
    groupSize: params.groupSize,
    showCommonTitles: true,
    auctionMode: 'live',
    createdAt: Date.now(),
  };
  const state: SessionState = { phase: 'prologue' };
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

/** 세션 메타 1회 조회 (코드 입장 시 반 이름 등 표시용). 없으면 null. */
export async function getSessionMeta(code: string): Promise<SessionMeta | null> {
  const snap = await get(ref(db, paths.meta(code)));
  return snap.exists() ? (snap.val() as SessionMeta) : null;
}

/** 교사 단계 전환 (source of truth). */
export async function setPhase(code: string, phase: Phase): Promise<void> {
  await update(ref(db, paths.state(code)), { phase });
}

/** 교사 콘텐츠(프롤로그·발문) 편집 저장. */
export async function saveContent(code: string, content: SessionContent): Promise<void> {
  await set(ref(db, paths.content(code)), content);
}

/** 결과 발표: 감정가·순위 공개 토글. (레거시) */
export async function setReveal(code: string, reveal: boolean): Promise<void> {
  await update(ref(db, paths.state(code)), { revealValues: reveal });
}

/** 결과 발표: 공개된 작품 수 설정. null이면 대기 화면으로 리셋. */
export async function setRevealCount(code: string, count: number | null): Promise<void> {
  await update(ref(db, paths.state(code)), { revealedCount: count ?? null });
}

/** 공통작품감상실 작품 이름 표시 여부 설정. */
export async function setShowCommonTitles(code: string, show: boolean): Promise<void> {
  await update(ref(db, paths.meta(code)), { showCommonTitles: show });
}

/** 경매 방식 설정. */
export async function setAuctionMode(code: string, mode: import('@/models').AuctionMode): Promise<void> {
  await update(ref(db, paths.meta(code)), { auctionMode: mode });
}
