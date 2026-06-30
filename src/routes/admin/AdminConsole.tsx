import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRtdbValue } from '@/firebase/hooks';
import { paths } from '@/firebase/paths';
import { PHASE_LABELS } from '@/features/session/api';
import { openTv, openStudentQr } from '@/features/teacher/share';
import { clearAdminUnlocked } from '@/features/admin/api';
import { tokens } from '@/theme';
import type {
  Appreciation,
  Artwork,
  Group,
  SessionMeta,
  SessionState,
  Student,
} from '@/models';

const GOLD = '#c4975a';
const BORDER = 'rgba(196,167,90,0.4)';
const CARD = { borderColor: 'rgba(196,167,90,0.18)', background: 'rgba(28,18,10,0.5)' };

interface RawSession {
  meta?: SessionMeta;
  state?: SessionState;
  students?: Record<string, Student>;
  groups?: Record<string, Group>;
  artworks?: Record<string, Artwork>;
  appreciations?: Record<string, Record<string, Appreciation>>;
}

interface Row {
  code: string;
  className?: string;
  teacherName?: string;
  gradeBand?: string;
  phase: string;
  createdAt: number;
  students: number;
  online: number;
  groups: number;
  common: number;
  branch: number;
  answers: number;
}

const ONLINE_MS = 120_000;

function summarize(code: string, s: RawSession, now: number): Row {
  const students = s.students ? Object.values(s.students) : [];
  const artworks = s.artworks ? Object.values(s.artworks) : [];
  let answers = 0;
  if (s.appreciations) {
    for (const byArt of Object.values(s.appreciations)) {
      for (const ap of Object.values(byArt)) {
        answers += (ap.answers ?? []).filter((a) => a && a.trim()).length;
      }
    }
  }
  return {
    code,
    className: s.meta?.className,
    teacherName: s.meta?.teacherName,
    gradeBand: s.meta?.gradeBand,
    phase: s.state?.phase ?? 'lobby',
    createdAt: s.meta?.createdAt ?? 0,
    students: students.length,
    online: students.filter((st) => now - (st.lastSeenAt ?? 0) < ONLINE_MS).length,
    groups: s.groups ? Object.keys(s.groups).length : 0,
    common: artworks.filter((a) => a.placement?.kind === 'common').length,
    branch: artworks.filter((a) => a.placement?.kind === 'branch').length,
    answers,
  };
}

function fmtTime(ms: number): string {
  if (!ms) return '—';
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdminConsole() {
  const navigate = useNavigate();
  const all = useRtdbValue<Record<string, RawSession>>(paths.sessionsRoot());
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState('');

  const rows = useMemo(() => {
    if (!all) return [];
    const now = Date.now();
    const list = Object.entries(all).map(([code, s]) => summarize(code, s, now));
    list.sort((a, b) => b.createdAt - a.createdAt);
    const q = query.trim().toUpperCase();
    return q
      ? list.filter(
          (r) => r.code.includes(q) || (r.className ?? '').toUpperCase().includes(q),
        )
      : list;
  }, [all, query]);

  const totalStudents = rows.reduce((n, r) => n + r.students, 0);
  const totalOnline = rows.reduce((n, r) => n + r.online, 0);

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(''), 1200);
    } catch {
      /* clipboard 차단 시 무시 */
    }
  }

  function logout() {
    clearAdminUnlocked();
    navigate('/');
  }

  return (
    <div className="min-h-screen font-body text-cream" style={{ background: tokens.effect.wallGradient }}>
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* 헤더 */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-2xl italic">🛡 슈퍼어드민</span>
            <span className="text-xs" style={{ color: 'rgba(232,217,184,0.6)' }}>
              모든 세션 모니터링
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/teacher"
              className="rounded-full border px-4 py-2 text-sm"
              style={{ borderColor: GOLD, background: 'rgba(196,167,90,0.12)', color: '#ead9b8' }}
            >
              💻 교사 콘솔
            </Link>
            <button
              onClick={logout}
              className="rounded-full border px-3 py-2 text-sm"
              style={{ borderColor: 'rgba(224,160,160,0.4)', color: 'rgba(232,217,184,0.7)' }}
            >
              잠그고 나가기
            </button>
          </div>
        </div>

        {/* 요약 */}
        <div className="mb-4 flex flex-wrap gap-3">
          <Stat label="세션" value={rows.length} />
          <Stat label="접속 학생" value={`${totalOnline} / ${totalStudents}`} />
        </div>

        {/* 검색 */}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="코드로 검색 (예: ABC123)"
          className="mb-4 w-full max-w-xs rounded border bg-transparent px-4 py-2 text-sm uppercase outline-none"
          style={{ borderColor: BORDER, color: '#ead9b8' }}
        />

        {all === undefined ? (
          <div className="py-20 text-center text-sm" style={{ color: 'rgba(232,217,184,0.6)' }}>
            세션을 불러오는 중…
          </div>
        ) : rows.length === 0 ? (
          <div className="py-20 text-center text-sm" style={{ color: 'rgba(232,217,184,0.6)' }}>
            {query ? '검색 결과가 없어요' : '아직 생성된 세션이 없어요'}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((r) => (
              <div
                key={r.code}
                className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border px-4 py-3"
                style={CARD}
              >
                <div className="flex w-40 flex-col">
                  <span className="truncate font-medium" style={{ color: '#ead9b8' }}>
                    {r.className || '(이름 없는 반)'}
                    {r.teacherName ? (
                      <span className="ml-1 text-[11px]" style={{ color: 'rgba(232,217,184,0.5)' }}>
                        · {r.teacherName}
                      </span>
                    ) : null}
                  </span>
                  <span className="font-display text-xl tracking-[0.12em]" style={{ color: GOLD }}>
                    {r.code}
                  </span>
                  <span className="text-[11px]" style={{ color: 'rgba(232,217,184,0.5)' }}>
                    {fmtTime(r.createdAt)}
                  </span>
                </div>

                <Badge>{PHASE_LABELS[r.phase as keyof typeof PHASE_LABELS] ?? r.phase}</Badge>
                {r.gradeBand && (
                  <span className="text-xs" style={{ color: 'rgba(232,217,184,0.7)' }}>
                    {r.gradeBand === '3-4' ? '3~4학년' : '5~6학년'}
                  </span>
                )}

                <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: 'rgba(232,217,184,0.75)' }}>
                  <span>
                    학생 <b style={{ color: '#8fce8f' }}>{r.online}</b>/{r.students}
                  </span>
                  <span>모둠 {r.groups}</span>
                  <span>작품 공통 {r.common}·선택 {r.branch}</span>
                  <span>감상 {r.answers}개</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Action onClick={() => navigate(`/teacher?code=${r.code}`)}>열기</Action>
                  <Action onClick={() => openTv(r.code)}>📺 TV</Action>
                  <Action onClick={() => openStudentQr(r.code)}>📱 QR</Action>
                  <Action onClick={() => copyCode(r.code)}>
                    {copied === r.code ? '복사됨 ✓' : '코드 복사'}
                  </Action>
                </div>
              </div>
            ))}
          </div>
        )}

        <Link to="/" className="mt-6 inline-block text-xs" style={{ color: 'rgba(232,217,184,0.5)' }}>
          ← 홈으로
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border px-4 py-2" style={CARD}>
      <div className="text-[11px]" style={{ color: 'rgba(232,217,184,0.6)' }}>{label}</div>
      <div className="font-display text-xl" style={{ color: '#ead9b8' }}>{value}</div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="rounded-full border px-3 py-1 text-[11px]"
      style={{ borderColor: BORDER, color: '#ead9b8', background: 'rgba(196,167,90,0.1)' }}
    >
      {children}
    </span>
  );
}

function Action({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border px-3 py-1.5 text-xs"
      style={{ borderColor: 'rgba(196,167,90,0.3)', color: 'rgba(232,217,184,0.85)' }}
    >
      {children}
    </button>
  );
}
