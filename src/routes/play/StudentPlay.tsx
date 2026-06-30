import { useEffect, useState } from 'react';
import { get, ref } from 'firebase/database';
import { db } from '@/firebase/app';
import { MuseumShell } from '@/components/MuseumShell';
import { useRtdbValue, useRtdbList } from '@/firebase/hooks';
import { paths } from '@/firebase/paths';
import { joinSession } from '@/features/entry/api';
import { sessionExists, PHASE_LABELS } from '@/features/session/api';
import {
  loadStudentRecent,
  saveStudentRecent,
  removeStudentRecent,
} from '@/features/session/studentRecent';
import type { Student } from '@/models';
import { sortByOrder } from '@/features/artwork/api';
import { GalleryView } from '@/features/appreciation/GalleryView';
import { GalleryScene } from '@/features/appreciation/GalleryScene';
import { BranchView } from '@/features/branch/BranchView';
import { StudentAuctionView } from '@/features/auction/StudentAuctionView';
import { ResultsView } from '@/features/results/ResultsView';
import { PrologueView } from '@/features/prologue/PrologueView';
import { DEFAULT_PROMPTS } from '@/content/prompts';
import { DEFAULT_PROLOGUE } from '@/content/prologue';
import type {
  Artwork,
  Group,
  SessionContent,
  SessionMeta,
  SessionState,
} from '@/models';

const GOLD = '#c4975a';
const BORDER = 'rgba(196,167,90,0.4)';

interface Joined {
  code: string;
  number: string;
  name: string;
  groupId: string;
}

export function StudentPlay() {
  const [joined, setJoined] = useState<Joined | null>(null);
  const [stage, setStage] = useState<'info' | 'group'>('info');
  const [code, setCode] = useState(
    () => new URLSearchParams(window.location.search).get('code')?.toUpperCase() ?? '',
  );
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupCounts, setGroupCounts] = useState<Record<string, number>>({});
  const [groupSize, setGroupSize] = useState(99);
  const [myGroupId, setMyGroupId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [recentList, setRecentList] = useState(() => loadStudentRecent());

  function applyRecent(r: ReturnType<typeof loadStudentRecent>[number]) {
    setCode(r.code);
    setNumber(r.number);
    setName(r.name);
    setError(null);
  }

  function forgetRecent(c: string, n: string) {
    removeStudentRecent(c, n);
    setRecentList(loadStudentRecent());
  }

  async function handleContinue() {
    setBusy(true);
    setError(null);
    try {
      const c = code.trim().toUpperCase();
      const num = number.trim();
      const nm = name.trim();
      if (!c || !num || !nm) {
        setError('코드 · 번호 · 이름을 모두 입력해 주세요.');
        return;
      }
      if (!(await sessionExists(c))) {
        setError('코드를 찾을 수 없어요');
        return;
      }
      const [gSnap, sSnap, mSnap] = await Promise.all([
        get(ref(db, paths.groups(c))),
        get(ref(db, paths.students(c))),
        get(ref(db, paths.meta(c))),
      ]);
      const list: Group[] = gSnap.exists() ? Object.values(gSnap.val()) : [];
      const studentsVal = (sSnap.exists() ? sSnap.val() : {}) as Record<string, Student>;
      const counts: Record<string, number> = {};
      for (const st of Object.values(studentsVal)) counts[st.groupId] = (counts[st.groupId] ?? 0) + 1;

      // 이름 불일치 검사 — 동일 번호에 다른 이름이 등록돼 있으면 경고
      const existing = studentsVal[num];
      if (existing && existing.name !== nm) {
        const next = failCount + 1;
        setFailCount(next);
        setError(
          next >= 2
            ? '🚨 이름이 기억나지 않으면 선생님께 여쭤보세요!'
            : `이 번호(${num}번)에는 다른 이름이 등록돼 있어요. 다시 확인해 주세요.`,
        );
        return;
      }

      setGroups(list);
      setGroupCounts(counts);
      setGroupSize((mSnap.val() as SessionMeta | null)?.groupSize ?? 99);
      setMyGroupId(studentsVal[num]?.groupId);
      setStage('group');
    } catch {
      setError('확인에 실패했어요. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(groupId: string) {
    setBusy(true);
    try {
      const c = code.trim().toUpperCase();
      const num = number.trim();
      const nm = name.trim();
      await joinSession(c, num, nm, groupId);
      saveStudentRecent({ code: c, number: num, name: nm, joinedAt: Date.now() });
      setRecentList(loadStudentRecent());
      setJoined({ code: c, number: num, name: nm, groupId });
    } catch {
      setError('입장에 실패했어요.');
    } finally {
      setBusy(false);
    }
  }

  if (joined)
    return (
      <StudentSession
        joined={joined}
        onExit={() => {
          setJoined(null);
          setStage('info');
        }}
      />
    );

  if (stage === 'group') {
    return (
      <MuseumShell title="모둠 선택" route="/play">
        <div className="mt-8 flex w-72 flex-col gap-3">
          <div className="text-center text-sm text-cream-dim">어느 모둠인가요?</div>
          {groups.map((g) => {
            const n = groupCounts[g.id] ?? 0;
            const full = n >= groupSize && g.id !== myGroupId;
            return (
              <button
                key={g.id}
                onClick={() => handleJoin(g.id)}
                disabled={busy || full}
                className="flex items-center justify-between rounded-full border px-6 py-3 disabled:opacity-40"
                style={{ borderColor: GOLD, background: 'rgba(196,167,90,0.1)', color: '#ead9b8' }}
              >
                <span>{g.name}</span>
                <span className="text-xs" style={{ color: 'rgba(232,217,184,0.6)' }}>
                  {n}/{groupSize}명{full ? ' · 꽉 참' : ''}
                </span>
              </button>
            );
          })}
          {error && (
            <div className="text-center text-sm" style={{ color: '#e0a0a0' }}>
              {error}
            </div>
          )}
        </div>
      </MuseumShell>
    );
  }

  return (
    <MuseumShell title="미술관 입장" route="/play">
      <div className="mt-6 flex w-72 flex-col gap-3">

        {/* 이전 입장 기록 */}
        {recentList.length > 0 && (
          <div className="mb-1">
            <div className="mb-1.5 text-[11px] tracking-widest" style={{ color: 'rgba(196,167,90,0.5)' }}>
              이전 입장 기록
            </div>
            <div className="flex flex-col gap-1.5">
              {recentList.map((r) => (
                <div
                  key={`${r.code}-${r.number}`}
                  className="flex items-center gap-1 rounded-lg border"
                  style={{ borderColor: 'rgba(196,167,90,0.2)', background: 'rgba(28,18,10,0.5)' }}
                >
                  <button
                    onClick={() => applyRecent(r)}
                    className="flex-1 px-3 py-2 text-left"
                  >
                    <div className="text-sm font-medium" style={{ color: '#ead9b8' }}>
                      {r.number}번 {r.name}
                    </div>
                    <div className="font-mono text-[11px] tracking-widest" style={{ color: 'rgba(196,167,90,0.6)' }}>
                      {r.code}
                    </div>
                  </button>
                  <button
                    onClick={() => forgetRecent(r.code, r.number)}
                    className="px-3 py-2 text-xs"
                    style={{ color: 'rgba(232,217,184,0.3)' }}
                    title="목록에서 삭제"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2 border-t" style={{ borderColor: 'rgba(196,167,90,0.1)' }} />
          </div>
        )}

        {/* 코드 입력 */}
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => { if (e.key === 'Enter' && code && number && name) handleContinue(); }}
          placeholder="교사 접속 코드"
          className="rounded border bg-transparent px-4 py-3 text-center text-lg tracking-widest outline-none uppercase"
          style={{ borderColor: BORDER, color: '#ead9b8' }}
        />
        <div className="flex gap-2">
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && code && number && name) handleContinue(); }}
            placeholder="번호"
            inputMode="numeric"
            className="w-20 rounded border bg-transparent px-3 py-3 text-center outline-none"
            style={{ borderColor: BORDER, color: '#ead9b8' }}
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && code && number && name) handleContinue(); }}
            placeholder="이름"
            className="flex-1 rounded border bg-transparent px-3 py-3 outline-none"
            style={{ borderColor: BORDER, color: '#ead9b8' }}
          />
        </div>
        {error && (
          <div className="rounded border px-3 py-2 text-center text-sm" style={{ borderColor: 'rgba(224,160,160,0.3)', background: 'rgba(224,160,160,0.08)', color: '#e0a0a0' }}>
            {error}
          </div>
        )}
        <button
          onClick={handleContinue}
          disabled={busy || !code || !number || !name}
          className="rounded-full border px-6 py-3 font-bold disabled:opacity-50"
          style={{ borderColor: GOLD, background: 'rgba(196,167,90,0.18)', color: '#ead9b8' }}
        >
          {busy ? '확인 중…' : '다음 →'}
        </button>
      </div>
    </MuseumShell>
  );
}

function StudentSession({ joined, onExit }: { joined: Joined; onExit: () => void }) {
  const state = useRtdbValue<SessionState>(paths.state(joined.code));
  const meta = useRtdbValue<SessionMeta>(paths.meta(joined.code));
  const content = useRtdbValue<SessionContent>(paths.content(joined.code));
  const artworks = useRtdbList<Artwork>(paths.artworks(joined.code));

  const phase = state?.phase ?? 'lobby';

  // RPG식 입장 장면: 공통작품감상실에 들어가기 전 연출 (단계가 바뀌면 초기화)
  const [enteredGallery, setEnteredGallery] = useState(false);
  useEffect(() => {
    if (phase !== 'gallery') setEnteredGallery(false);
  }, [phase]);
  const gradeBand = meta?.gradeBand ?? '3-4';
  const prompts =
    content?.prompts && content.prompts.length > 0 ? content.prompts : DEFAULT_PROMPTS[gradeBand];

  let view: React.ReactNode;
  if (phase === 'prologue') {
    const steps =
      content?.prologue && content.prologue.length > 0 ? content.prologue : DEFAULT_PROLOGUE[gradeBand];
    view = <PrologueView steps={steps} />;
  } else if (phase === 'gallery' && meta) {
    const common = sortByOrder(artworks.filter((a) => a.placement?.kind === 'common'));
    view = !enteredGallery ? (
      <GalleryScene onEnter={() => setEnteredGallery(true)} />
    ) : (
      <GalleryView
        code={joined.code}
        studentNumber={joined.number}
        studentName={joined.name}
        gradeBand={gradeBand}
        prompts={prompts}
        artworks={common}
        showTitle={meta.showCommonTitles !== false}
      />
    );
  } else if (phase === 'branch' && meta) {
    view = (
      <BranchView
        code={joined.code}
        studentNumber={joined.number}
        studentName={joined.name}
        gradeBand={gradeBand}
        prompts={prompts}
        artworks={artworks}
      />
    );
  } else if (phase === 'auction' && meta) {
    view = (
      <StudentAuctionView
        code={joined.code}
        studentNumber={joined.number}
        groupId={joined.groupId}
        artworks={artworks}
      />
    );
  } else if (phase === 'result') {
    view = <ResultsView code={joined.code} />;
  } else {
    view = (
      <MuseumShell title={`${joined.name} 님`} route="/play">
        <div className="mt-6 text-center">
          <div className="text-sm text-cream-dim">
            {joined.number}번 · 코드 {joined.code}
          </div>
          <div className="mt-4 font-display text-3xl italic" style={{ color: GOLD }}>
            {PHASE_LABELS[phase]}
          </div>
          <div className="mt-2 text-xs text-cream-dim">교사가 다음 단계를 열면 자동으로 이동해요</div>
        </div>
      </MuseumShell>
    );
  }

  return (
    <>
      {view}
      <button
        onClick={() => { if (window.confirm('미술관에서 나가시겠어요?')) onExit(); }}
        className="fixed right-3 top-3 z-[300] rounded-full border px-3 py-1.5 text-xs"
        style={{ borderColor: 'rgba(224,160,160,0.4)', background: 'rgba(12,8,4,0.7)', color: 'rgba(232,217,184,0.8)' }}
      >
        나가기
      </button>
    </>
  );
}
