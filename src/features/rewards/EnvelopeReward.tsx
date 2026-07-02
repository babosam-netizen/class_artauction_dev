import { useState } from 'react';
import { rollEnvelopes } from './api';
import { formatWon } from '@/utils/format';

const C = {
  panel: '#1c120a',
  gold: '#c4975a',
  cream: '#ead9b8',
  green: '#8fce8f',
};

/**
 * 사례금 봉투 연출. 3개 중 1개를 고르면 그 봉투 금액이 확정돼 onDone(amount)로 전달된다.
 * (금액은 마운트 시 가중치 랜덤으로 미리 굴려 둠 — 같은 화면이어도 매번 다름)
 */
export function EnvelopeReward({
  kind,
  onDone,
}: {
  kind: 'common' | 'branch';
  onDone: (amount: number) => void;
}) {
  const [envelopes] = useState<number[]>(() => rollEnvelopes(3));
  const [picked, setPicked] = useState<number | null>(null);

  function pick(i: number) {
    if (picked !== null) return;
    setPicked(i);
    // 열어보는 연출 후 확정
    window.setTimeout(() => onDone(envelopes[i]), 1900);
  }

  return (
    <div
      className="absolute inset-0 z-[20] flex items-center justify-center px-6"
      style={{ background: 'rgba(8,5,3,0.9)' }}
    >
      <div
        className="w-full max-w-lg rounded-2xl border p-8 text-center"
        style={{ background: C.panel, borderColor: 'rgba(196,167,90,0.3)', animation: 'fadeUp 0.35s ease' }}
      >
        <div className="text-[11px] tracking-[3px]" style={{ color: 'rgba(196,167,90,0.7)' }}>
          {kind === 'branch' ? '선택작품 감상 완료' : '작품 감상 완료'}
        </div>
        <div className="mt-1 font-display text-2xl italic" style={{ color: C.cream }}>
          사례금 봉투 3개 중 하나를 고르세요
        </div>
        <div className="mt-1 text-xs" style={{ color: 'rgba(232,217,184,0.6)' }}>
          고른 봉투의 사례금이 우리 모둠 경매자금에 들어가요
        </div>

        <div className="mt-7 flex items-end justify-center gap-4">
          {envelopes.map((amt, i) => {
            const isPicked = picked === i;
            const revealed = picked !== null;
            return (
              <button
                key={i}
                onClick={() => pick(i)}
                disabled={revealed}
                className="flex flex-col items-center gap-2"
                style={{
                  transform: isPicked ? 'translateY(-10px) scale(1.08)' : 'none',
                  transition: 'all 0.35s ease',
                  opacity: revealed && !isPicked ? 0.5 : 1,
                  cursor: revealed ? 'default' : 'pointer',
                }}
              >
                <div
                  className="flex h-24 w-28 items-center justify-center rounded-lg border-2 text-4xl"
                  style={{
                    borderColor: isPicked ? C.green : C.gold,
                    background: isPicked ? 'rgba(143,206,143,0.15)' : 'rgba(196,167,90,0.1)',
                    boxShadow: isPicked ? '0 0 26px rgba(143,206,143,0.4)' : 'none',
                  }}
                >
                  {revealed ? '📄' : '✉️'}
                </div>
                <div
                  className="font-display text-lg italic"
                  style={{ color: isPicked ? C.green : 'rgba(232,217,184,0.55)', minHeight: 24 }}
                >
                  {revealed ? formatWon(amt) : '?'}
                </div>
              </button>
            );
          })}
        </div>

        {picked !== null && (
          <div className="mt-6 font-display text-2xl italic" style={{ color: C.green, animation: 'fadeUp 0.3s ease' }}>
            {formatWon(envelopes[picked])} 받으셨습니다! 🎉
            <div className="mt-1 text-xs not-italic" style={{ color: 'rgba(232,217,184,0.7)' }}>
              모둠 경매자금에 보탰어요
            </div>
          </div>
        )}
        {picked === null && (
          <div className="mt-6 text-xs" style={{ color: 'rgba(196,167,90,0.4)' }}>
            봉투마다 금액이 달라요 — 운을 시험해 보세요!
          </div>
        )}
      </div>
    </div>
  );
}
