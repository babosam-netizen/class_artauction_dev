/** 원 금액을 "억/천만" 단위로 표시 (천만원 단위까지). */
export function formatWon(n: number): string {
  const eok = Math.floor(n / 100_000_000);
  const cheonman = Math.floor((n % 100_000_000) / 10_000_000);
  if (eok > 0 && cheonman > 0) return `${eok}억 ${cheonman}천만`;
  if (eok > 0) return `${eok}억`;
  if (cheonman > 0) return `${cheonman}천만`;
  const man = Math.floor(n / 10_000);
  if (man > 0) return `${man}만`;
  return `${n.toLocaleString()}원`;
}
