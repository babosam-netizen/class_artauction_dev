// 디자인 토큰 — 단일 소스 (PRD v1.1 §7.1, Claude Design 핸드오프 반영)
// Claude Design 후속 산출물로 이 파일만 교체하면 전체 톤이 바뀐다.

export const tokens = {
  color: {
    // 미술관 벽 / 바닥
    bgBase: '#130e08',
    bgFloor: '#070503',
    // 감상 기록 패널
    panel: '#1c120a',
    // 시그니처 골드
    gold: '#c4975a',
    goldTint: '#dcbe82',
    // 텍스트
    cream: '#ead9b8',
    creamDim: 'rgba(232,217,184,0.82)',
  },
  // 자주 쓰는 합성 값
  effect: {
    wallGradient:
      'radial-gradient(ellipse 110% 90% at 50% 28%, #2e1e10 0%, #0c0804 100%)',
    spotlight:
      'radial-gradient(ellipse 52% 62% at 50% 40%, rgba(255,220,140,0.09) 0%, transparent 68%)',
    frameGradient:
      'linear-gradient(145deg, #d4b862 0%, #8b6010 20%, #c49b38 40%, #7a5010 60%, #c4a040 80%, #8b6010 100%)',
  },
  font: {
    display: "'Cormorant Garamond', serif",
    body: "'Noto Sans KR', sans-serif",
  },
} as const;

export type Tokens = typeof tokens;
