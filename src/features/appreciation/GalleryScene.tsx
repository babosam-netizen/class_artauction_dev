const C = {
  gold: '#c4975a',
  cream: '#ead9b8',
  creamDim: 'rgba(232,217,184,0.8)',
  wall: 'radial-gradient(ellipse 110% 90% at 50% 35%, #2e1e10 0%, #0c0804 100%)',
};

interface Props {
  title?: string;
  subtitle?: string;
  onEnter: () => void;
}

/** RPG식 입장 장면 — 전시실에 들어서는 연출. */
export function GalleryScene({
  title = '공통 전시실',
  subtitle = '모두가 함께 보는 전시실이에요. 작품을 천천히 둘러보며 질문에 답해 볼까요?',
  onEnter,
}: Props) {
  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden font-body" style={{ background: C.wall }}>
      {/* 스포트라이트 */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 50% 55% at 50% 42%, rgba(255,220,140,0.12) 0%, transparent 68%)' }}
      />
      {/* 바닥선 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-24 h-px" style={{ background: 'rgba(196,167,90,0.15)' }} />

      <div className="relative z-10 flex flex-col items-center px-6 text-center" style={{ animation: 'fadeUp 0.6s ease' }}>
        {/* 황금 아치 문 */}
        <div
          className="flex items-end justify-center"
          style={{
            width: 180,
            height: 150,
            borderTopLeftRadius: 90,
            borderTopRightRadius: 90,
            border: '2px solid rgba(196,167,90,0.5)',
            borderBottom: 'none',
            background: 'linear-gradient(to top, rgba(196,167,90,0.18), transparent)',
          }}
        >
          <span style={{ fontSize: 56, marginBottom: 8 }}>🏛️</span>
        </div>

        <div className="mt-8 text-xs tracking-[4px]" style={{ color: 'rgba(196,167,90,0.7)' }}>
          GALLERY
        </div>
        <div className="mt-2 font-display text-5xl italic" style={{ color: C.cream }}>
          {title}
        </div>
        <p className="mt-4 max-w-sm text-sm leading-relaxed" style={{ color: C.creamDim }}>
          {subtitle}
        </p>

        <button
          onClick={onEnter}
          className="mt-9 rounded-full border px-9 py-3.5 text-base"
          style={{ borderColor: C.gold, background: 'rgba(196,167,90,0.16)', color: C.cream, animation: 'fadeUp 0.6s ease 0.3s both' }}
        >
          전시실에 들어가기 →
        </button>
      </div>
    </div>
  );
}
