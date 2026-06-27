import { useEffect, useState } from 'react';
import { useRtdbValue, useRtdbList } from '@/firebase/hooks';
import { paths } from '@/firebase/paths';
import { updateGroupConfig } from '@/features/group/api';
import type { Group, SessionMeta, Student } from '@/models';

const GOLD = '#c4975a';

export function GroupSettings({ code }: { code: string }) {
  const meta = useRtdbValue<SessionMeta>(paths.meta(code));
  const groupsMap = useRtdbValue<Record<string, Group>>(paths.groups(code)) ?? {};
  const students = useRtdbList<Student>(paths.students(code));

  const [count, setCount] = useState<number | null>(null);
  const [size, setSize] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (meta) {
      setCount((c) => c ?? meta.groupCount);
      setSize((s) => s ?? meta.groupSize ?? 4);
    }
  }, [meta]);

  if (!meta || count === null || size === null) return null;

  const membersOf = (gid: string) => students.filter((s) => s.groupId === gid).length;
  // 삭제될 모둠(번호 > count)에 속한 학생 수
  const orphaned = Object.values(groupsMap)
    .filter((g) => Number(g.id.replace('g', '')) > count)
    .reduce((sum, g) => sum + membersOf(g.id), 0);
  const changed = count !== meta.groupCount || size !== (meta.groupSize ?? 4);

  async function apply() {
    if (orphaned > 0 && !window.confirm(`삭제되는 모둠에 학생 ${orphaned}명이 있어요. 이 학생들은 '미배정'이 됩니다. 계속할까요?`)) {
      return;
    }
    setBusy(true);
    try {
      await updateGroupConfig(code, count!, size!, meta!.startingFunds);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full rounded-lg border p-5 text-left" style={{ borderColor: 'rgba(196,167,90,0.2)', background: 'rgba(28,18,10,0.6)' }}>
      <div className="mb-3 text-sm font-medium" style={{ color: GOLD }}>모둠 설정</div>

      <Row label="모둠 수">
        <Stepper value={count} min={1} max={12} suffix="모둠" onChange={setCount} />
      </Row>
      <div className="mt-2" />
      <Row label="모둠당 인원">
        <Stepper value={size} min={1} max={15} suffix="명" onChange={setSize} />
      </Row>

      {/* 현재 모둠별 인원 */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {Object.values(groupsMap)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((g) => {
            const willRemove = Number(g.id.replace('g', '')) > count;
            return (
              <span
                key={g.id}
                className="rounded px-2 py-1 text-[11px]"
                style={{
                  background: willRemove ? 'rgba(224,160,160,0.15)' : 'rgba(196,167,90,0.1)',
                  color: willRemove ? '#e0a0a0' : '#ead9b8',
                  textDecoration: willRemove ? 'line-through' : 'none',
                }}
              >
                {g.name} {membersOf(g.id)}/{size}
              </span>
            );
          })}
      </div>

      {orphaned > 0 && (
        <div className="mt-2 text-xs" style={{ color: '#e0a0a0' }}>
          ⚠️ 줄이면 학생 {orphaned}명이 미배정됩니다
        </div>
      )}

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={apply}
          disabled={busy || !changed}
          className="rounded-full border px-5 py-2 text-sm disabled:opacity-40"
          style={{ borderColor: GOLD, background: 'rgba(196,167,90,0.15)', color: '#ead9b8' }}
        >
          {busy ? '적용 중…' : '변경 적용'}
        </button>
        {saved && <span className="text-xs" style={{ color: '#8fce8f' }}>적용됨 ✓</span>}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: 'rgba(232,217,184,0.8)' }}>{label}</span>
      {children}
    </div>
  );
}

function Stepper({ value, min, max, suffix, onChange }: { value: number; min: number; max: number; suffix?: string; onChange: (v: number) => void }) {
  const btn = 'flex h-8 w-8 items-center justify-center rounded-full border text-lg disabled:opacity-30';
  const style = { borderColor: GOLD, color: '#ead9b8' };
  return (
    <div className="flex items-center gap-3">
      <button className={btn} style={style} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>−</button>
      <span className="w-14 text-center font-display text-lg" style={{ color: '#ead9b8' }}>
        {value}
        {suffix && <span className="ml-1 text-xs" style={{ color: 'rgba(232,217,184,0.6)' }}>{suffix}</span>}
      </span>
      <button className={btn} style={style} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>＋</button>
    </div>
  );
}
