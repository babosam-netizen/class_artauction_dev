import { useEffect, useState } from 'react';
import { get, ref } from 'firebase/database';
import { db } from '@/firebase/app';
import { MuseumShell } from '@/components/MuseumShell';
import { useRtdbValue, useRtdbList } from '@/firebase/hooks';
import { paths } from '@/firebase/paths';
import { joinSession } from '@/features/entry/api';
import { sessionExists, PHASE_LABELS } from '@/features/session/api';
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

  async function handleContinue() {
    setBusy(true);
    setError(null);
    try {
      const c = code.trim().toUpperCase();
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
      const studentsVal = (sSnap.exists() ? sSnap.val() : {}) as Record<string, { groupId: string }>;
      const counts: Record<string, number> = {};
      for (const st of Object.values(studentsVal)) counts[st.groupId] = (counts[st.groupId] ?? 0) + 1;
      setGroups(list);
      setGroupCounts(counts);
      setGroupSize((mSnap.val() as SessionMeta | null)?.groupSize ?? 99);
      setMyGroupId(studentsVal[number.trim()]?.groupId);
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
      await joinSession(c, number.trim(), name.trim(), groupId);
      setJoined({ code: c, number: number.trim(), name: name.trim(), groupId });
    } catch {
      setError('입장에 실패했어요.');
    } finally {
      setBusy(false);
    }
  }

  if (joined) return <StudentSession joined={joined} />;

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
      <div className="mt-8 flex w-72 flex-col gap-3">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="교사 접속 코드"
          className="rounded border bg-transparent px-4 py-3 text-center text-lg tracking-widest outline-none"
          style={{ borderColor: BORDER, color: '#ead9b8' }}
        />
        <div className="flex gap-2">
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="번호"
            inputMode="numeric"
            className="w-20 rounded border bg-transparent px-3 py-3 text-center outline-none"
            style={{ borderColor: BORDER, color: '#ead9b8' }}
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름"
            className="flex-1 rounded border bg-transparent px-3 py-3 outline-none"
            style={{ borderColor: BORDER, color: '#ead9b8' }}
          />
        </div>
        {error && (
          <div className="text-center text-sm" style={{ color: '#e0a0a0' }}>
            {error}
          </div>
        )}
        <button
          onClick={handleContinue}
          disabled={busy || !code || !number || !name}
          className="rounded-full border px-6 py-3 disabled:opacity-50"
          style={{ borderColor: GOLD, background: 'rgba(196,167,90,0.13)', color: '#ead9b8' }}
        >
          {busy ? '확인 중…' : '다음'}
        </button>
      </div>
    </MuseumShell>
  );
}

function StudentSession({ joined }: { joined: Joined }) {
  const state = useRtdbValue<SessionState>(paths.state(joined.code));
  const meta = useRtdbValue<SessionMeta>(paths.meta(joined.code));
  const content = useRtdbValue<SessionContent>(paths.content(joined.code));
  const artworks = useRtdbList<Artwork>(paths.artworks(joined.code));

  const phase = state?.phase ?? 'lobby';

  // RPG식 입장 장면: 공통회랑에 들어가기 전 연출 (단계가 바뀌면 초기화)
  const [enteredGallery, setEnteredGallery] = useState(false);
  useEffect(() => {
    if (phase !== 'gallery') setEnteredGallery(false);
  }, [phase]);
  const gradeBand = meta?.gradeBand ?? '3-4';
  const prompts =
    content?.prompts && content.prompts.length > 0 ? content.prompts : DEFAULT_PROMPTS[gradeBand];

  if (phase === 'prologue') {
    const steps =
      content?.prologue && content.prologue.length > 0 ? content.prologue : DEFAULT_PROLOGUE[gradeBand];
    return <PrologueView steps={steps} />;
  }

  if (phase === 'gallery' && meta) {
    if (!enteredGallery) {
      return <GalleryScene onEnter={() => setEnteredGallery(true)} />;
    }
    const common = sortByOrder(artworks.filter((a) => a.placement?.kind === 'common'));
    return (
      <GalleryView
        code={joined.code}
        studentNumber={joined.number}
        studentName={joined.name}
        gradeBand={gradeBand}
        prompts={prompts}
        artworks={common}
      />
    );
  }

  if (phase === 'branch' && meta) {
    return (
      <BranchView
        code={joined.code}
        studentNumber={joined.number}
        studentName={joined.name}
        gradeBand={gradeBand}
        prompts={prompts}
        artworks={artworks}
        doorCount={meta.branchDoorCount}
      />
    );
  }

  if (phase === 'auction' && meta) {
    return (
      <StudentAuctionView
        code={joined.code}
        studentNumber={joined.number}
        groupId={joined.groupId}
        artworks={artworks}
        minIncrement={meta.minIncrement}
        timerSeconds={meta.timerSeconds}
      />
    );
  }

  if (phase === 'result') {
    return <ResultsView code={joined.code} />;
  }

  // lobby / prologue 등: 대기 화면
  return (
    <MuseumShell title={`${joined.name} 님`} route="/play">
      <div className="mt-6 text-center">
        <div className="text-sm text-cream-dim">
          {joined.number}번 · 코드 {joined.code}
        </div>
        <div className="mt-4 font-display text-3xl italic" style={{ color: GOLD }}>
          {PHASE_LABELS[phase]}
        </div>
        <div className="mt-2 text-xs text-cream-dim">
          교사가 다음 단계를 열면 자동으로 이동해요
        </div>
      </div>
    </MuseumShell>
  );
}
