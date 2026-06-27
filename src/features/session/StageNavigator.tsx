import { setPhase, nextPhase, prevPhase } from './api';
import { PHASE_ORDER, PHASE_LABELS, PHASE_SUBSTAGES, PHASE_HINT } from './stages';
import type { Phase } from '@/models';

const GOLD = '#c4975a';

export function StageNavigator({ code, phase }: { code: string; phase: Phase }) {
  const idx = PHASE_ORDER.indexOf(phase);
  const atStart = idx <= 0;
  const atEnd = idx >= PHASE_ORDER.length - 1;

  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: 'rgba(196,167,90,0.25)', background: 'rgba(28,18,10,0.55)' }}
    >
      {/* 전체 단계 스텝퍼 */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {PHASE_ORDER.map((p, i) => {
          const done = i < idx;
          const current = i === idx;
          return (
            <div key={p} className="flex items-center">
              <div
                className="flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm"
                style={{
                  borderColor: current ? GOLD : 'rgba(196,167,90,0.25)',
                  background: current ? GOLD : done ? 'rgba(196,167,90,0.12)' : 'transparent',
                  color: current ? '#130e08' : done ? '#ead9b8' : 'rgba(232,217,184,0.5)',
                  fontWeight: current ? 700 : 400,
                }}
              >
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[11px]"
                  style={{
                    background: current ? '#130e08' : 'rgba(196,167,90,0.2)',
                    color: current ? GOLD : '#ead9b8',
                  }}
                >
                  {done ? '✓' : i + 1}
                </span>
                {PHASE_LABELS[p]}
              </div>
              {i < PHASE_ORDER.length - 1 && (
                <span style={{ color: 'rgba(196,167,90,0.4)', margin: '0 2px' }}>→</span>
              )}
            </div>
          );
        })}
      </div>

      {/* 현재 단계 상세 + 하위 단계 */}
      <div className="mt-4 rounded-lg p-3" style={{ background: 'rgba(196,167,90,0.06)' }}>
        <div className="flex items-baseline justify-between">
          <div className="font-display text-2xl italic" style={{ color: '#ead9b8' }}>
            {PHASE_LABELS[phase]}
          </div>
          <div className="text-xs" style={{ color: 'rgba(232,217,184,0.55)' }}>
            {idx + 1} / {PHASE_ORDER.length} 단계
          </div>
        </div>
        <div className="mt-1 text-sm" style={{ color: 'rgba(232,217,184,0.8)' }}>
          {PHASE_HINT[phase]}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {PHASE_SUBSTAGES[phase].map((s, i) => (
            <span
              key={i}
              className="rounded-md px-2.5 py-1 text-xs"
              style={{ background: 'rgba(196,167,90,0.12)', color: GOLD }}
            >
              {i + 1}. {s}
            </span>
          ))}
        </div>
      </div>

      {/* 단계 이동 */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          onClick={() => setPhase(code, prevPhase(phase))}
          disabled={atStart}
          className="flex-1 rounded-full border py-3 text-sm disabled:opacity-30"
          style={{ borderColor: 'rgba(196,167,90,0.4)', color: '#ead9b8' }}
        >
          ← 이전 단계
        </button>
        <button
          onClick={() => setPhase(code, nextPhase(phase))}
          disabled={atEnd}
          className="flex-[2] rounded-full border py-3 text-base disabled:opacity-30"
          style={{ borderColor: GOLD, background: 'rgba(196,167,90,0.18)', color: '#ead9b8' }}
        >
          다음 단계 →{' '}
          {!atEnd && (
            <b style={{ color: GOLD }}>{PHASE_LABELS[PHASE_ORDER[idx + 1]]}</b>
          )}
        </button>
      </div>
    </div>
  );
}
