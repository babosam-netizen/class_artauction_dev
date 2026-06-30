import { useNavigate } from 'react-router-dom';
import { tokens } from '@/theme';

const GOLD = '#c4975a';

export function Home() {
  const nav = useNavigate();

  const card = (emoji: string, title: string, desc: string, onClick: () => void, primary = false) => (
    <button
      onClick={onClick}
      className="flex w-64 flex-col items-center gap-2 rounded-2xl border p-7 transition"
      style={{
        borderColor: primary ? GOLD : 'rgba(196,167,90,0.3)',
        background: primary ? 'rgba(196,167,90,0.13)' : 'rgba(28,18,10,0.5)',
        color: '#ead9b8',
      }}
    >
      <span className="text-4xl">{emoji}</span>
      <span className="font-display text-2xl italic">{title}</span>
      <span className="text-xs" style={{ color: 'rgba(232,217,184,0.6)' }}>
        {desc}
      </span>
    </button>
  );

  return (
    <div
      className="min-h-screen font-body text-cream"
      style={{ background: tokens.effect.wallGradient }}
    >
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl">🏛️</div>
        <h1 className="mt-3 font-display text-5xl italic" style={{ color: '#ead9b8' }}>
          미술 감상 경매
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'rgba(232,217,184,0.6)' }}>
          작품을 감상하고, 모둠끼리 경매로 가치를 겨뤄요
        </p>

        <div className="mt-10 flex flex-wrap items-stretch justify-center gap-5">
          {card('💻', '교사 입장', '세션 생성 · 진행 · 현황 · 데모', () => nav('/teacher'), true)}
          {card('📱', '학생 입장', '코드로 미술관에 들어가기', () => nav('/play'))}
        </div>

        <button
          onClick={() => nav('/admin')}
          className="mt-8 text-xs"
          style={{ color: 'rgba(232,217,184,0.4)' }}
        >
          🛡 슈퍼어드민
        </button>
      </div>
    </div>
  );
}
