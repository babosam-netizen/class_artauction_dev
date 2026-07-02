import { useEffect } from 'react';
import { formatWon } from '@/utils/format';

const C = {
  gold: '#c4975a',
  cream: '#ead9b8',
  green: '#8fce8f',
  panel: '#1c120a',
};

/**
 * 보상 안내 배너. amount가 있으면 "얼마 받으셨습니다"를 크게 띄우고 잠시 뒤 사라진다.
 * kind='branch'는 랜덤(운) 연출, 'common'은 고정 지급 연출.
 */
export function RewardToast({
  amount,
  kind,
  onDone,
}: {
  amount: number | null;
  kind: 'common' | 'branch';
  onDone: () => void;
}) {
  useEffect(() => {
    if (amount === null) return;
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [amount, onDone]);

  if (amount === null) return null;

  const zero = amount === 0;
  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] flex justify-center px-4"
      style={{ animation: 'fadeUp 0.35s ease', pointerEvents: 'none' }}
    >
      <div
        className="mt-6 rounded-2xl border px-7 py-4 text-center"
        style={{
          background: C.panel,
          borderColor: zero ? 'rgba(196,167,90,0.4)' : C.green,
          boxShadow: '0 18px 60px rgba(0,0,0,0.6)',
        }}
      >
        <div className="text-[11px] tracking-[2px]" style={{ color: 'rgba(196,167,90,0.7)' }}>
          {kind === 'branch' ? '🎲 선택작품 보상' : '🖼 감상 보상'}
        </div>
        <div className="mt-1 font-display text-3xl italic" style={{ color: zero ? C.cream : C.green }}>
          {zero ? '아쉽게도 0원…' : `${formatWon(amount)} 받으셨습니다! 🎉`}
        </div>
        <div className="mt-1 text-xs" style={{ color: 'rgba(232,217,184,0.7)' }}>
          모둠 경매자금에 합산됐어요
        </div>
      </div>
    </div>
  );
}
