import type { GradeBand } from '@/models';

// 이 기기에서 만든 세션 기록(로컬). 같은 브라우저면 익명 uid가 유지돼 재입장 시 그대로 소유자.
export interface RecentSession {
  code: string;
  gradeBand: GradeBand;
  className?: string;
  teacherName?: string;
  createdAt: number;
}

const KEY = 'teacherRecentSessions';
const MAX = 8;

export function loadRecent(): RecentSession[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentSession[]) : [];
  } catch {
    return [];
  }
}

export function addRecent(s: RecentSession): void {
  const list = loadRecent().filter((x) => x.code !== s.code);
  list.unshift(s);
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
}

export function removeRecent(code: string): void {
  localStorage.setItem(KEY, JSON.stringify(loadRecent().filter((x) => x.code !== code)));
}
