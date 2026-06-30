export interface RecentStudentSession {
  code: string;
  number: string;
  name: string;
  joinedAt: number;
}

const KEY = 'studentRecentSessions';
const MAX = 5;

export function loadStudentRecent(): RecentStudentSession[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentStudentSession[]) : [];
  } catch {
    return [];
  }
}

export function saveStudentRecent(s: RecentStudentSession): void {
  const list = loadStudentRecent().filter((x) => !(x.code === s.code && x.number === s.number));
  list.unshift(s);
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
}

export function removeStudentRecent(code: string, number: string): void {
  localStorage.setItem(
    KEY,
    JSON.stringify(loadStudentRecent().filter((x) => !(x.code === code && x.number === number))),
  );
}
