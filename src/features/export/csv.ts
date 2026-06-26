import type { Appreciation, Artwork, Group, GroupResult, Student } from '@/models';

function escapeCell(v: string | number): string {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: (string | number)[][]): string {
  // ﻿: Excel 한글 인코딩
  return '﻿' + rows.map((r) => r.map(escapeCell).join(',')).join('\r\n');
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** 학생별 감상 기록 — 번호 정렬, (학생 × 작품 × 발문) 행. */
export function buildAppreciationsCsv(
  students: Student[],
  appreciations: Record<string, Record<string, Appreciation>>,
  artworks: Artwork[],
  groups: Record<string, Group>,
  prompts: string[],
): string {
  const rows: (string | number)[][] = [['번호', '이름', '모둠', '작품', '발문', '답변']];
  const sorted = [...students].sort(
    (a, b) => Number(a.number) - Number(b.number) || a.number.localeCompare(b.number),
  );
  const artById = new Map(artworks.map((a) => [a.id, a]));
  for (const s of sorted) {
    const groupName = groups[s.groupId]?.name ?? '';
    const byArt = appreciations[s.number] ?? {};
    for (const [artId, ap] of Object.entries(byArt)) {
      const art = artById.get(artId);
      (ap.answers ?? []).forEach((ans, i) => {
        rows.push([s.number, s.name, groupName, art?.title ?? artId, prompts[i] ?? `발문${i + 1}`, ans]);
      });
    }
  }
  return toCsv(rows);
}

/** 모둠별 경매 결과 — 순위 정렬. */
export function buildResultsCsv(
  results: GroupResult[],
  groups: Record<string, Group>,
  artworks: Artwork[],
): string {
  const rows: (string | number)[][] = [
    ['순위', '모둠', '낙찰작(지불가)', '남은현금', '감정가합', '자산'],
  ];
  const artById = new Map(artworks.map((a) => [a.id, a]));
  const ranked = [...results].sort((a, b) => a.rank - b.rank);
  for (const r of ranked) {
    const g = groups[r.groupId];
    const won = g?.wonItems ?? {};
    const wonStr = Object.entries(won)
      .map(([aid, paid]) => `${artById.get(aid)?.title ?? aid}(${paid.toLocaleString()})`)
      .join(' / ');
    rows.push([r.rank, g?.name ?? r.groupId, wonStr, r.remainingCash, r.wonAppraisedSum, r.asset]);
  }
  return toCsv(rows);
}
