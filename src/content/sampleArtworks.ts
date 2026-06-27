import type { Artwork } from '@/models';

// 데모 모드용 더미 작품 — 자료를 올리지 않아도 흐름을 체험할 수 있게.
// 이미지는 외부 의존 없는 인라인 SVG 그라디언트(data URI).

function gradient(c1: string, c2: string, c3: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="440">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${c1}"/><stop offset="0.5" stop-color="${c2}"/>` +
    `<stop offset="1" stop-color="${c3}"/></linearGradient></defs>` +
    `<rect width="600" height="440" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const SAMPLE_ARTWORKS: Artwork[] = [
  {
    id: 'sample-1',
    imageUrl: gradient('#1b4332', '#52b788', '#1b4332'),
    title: '수련 (Water Lilies)',
    source: '오르세 미술관 · 클로드 모네, 1906',
    appraisedValue: 8_000_000,
    commentary:
      '모네는 자기 정원의 연못을 수백 번 그렸어요. 물에 비친 하늘과 빛의 변화를 담으려 했지요. 또렷한 형태보다 색과 분위기로 느낌을 전합니다.',
    placement: { kind: 'common' },
    forAuction: true,
    order: 0,
  },
  {
    id: 'sample-2',
    imageUrl: gradient('#03045e', '#0077b6', '#90e0ef'),
    title: '별이 빛나는 밤 (The Starry Night)',
    source: '뉴욕 현대미술관 · 빈센트 반 고흐, 1889',
    appraisedValue: 12_000_000,
    commentary:
      '고흐가 요양원에서 본 밤하늘을 상상과 감정을 더해 그렸어요. 소용돌이치는 붓터치에서 마음의 움직임이 느껴집니다.',
    placement: { kind: 'common' },
    forAuction: true,
    order: 1,
  },
  {
    id: 'sample-3',
    imageUrl: gradient('#212529', '#adb5bd', '#212529'),
    title: '게르니카 (Guernica)',
    source: '레이나 소피아 · 파블로 피카소, 1937',
    appraisedValue: 20_000_000,
    commentary:
      '전쟁의 비극을 흑백으로 강렬하게 표현한 작품이에요. 일부러 색을 빼서 더 무겁고 슬픈 느낌을 줍니다.',
    placement: { kind: 'branch', door: 0 },
    forAuction: true,
    order: 2,
  },
  {
    id: 'sample-4',
    imageUrl: gradient('#1a1025', '#6b3d8a', '#c9b1d4'),
    title: '진주 귀고리를 한 소녀',
    source: '마우리츠하위스 · 요하네스 베르메르, 1665',
    appraisedValue: 15_000_000,
    commentary:
      '어두운 배경 속에서 소녀와 진주가 빛나요. 우리를 바라보는 듯한 눈빛과 입가의 표정이 신비로움을 줍니다.',
    placement: { kind: 'branch', door: 1 },
    forAuction: true,
    order: 3,
  },
];
