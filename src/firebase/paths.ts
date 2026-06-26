// RTDB 경로 헬퍼 — 오타 방지를 위한 단일 소스 (PRD §6 트리 레이아웃)

export const paths = {
  session: (code: string) => `sessions/${code}`,
  meta: (code: string) => `sessions/${code}/meta`,
  state: (code: string) => `sessions/${code}/state`,
  content: (code: string) => `sessions/${code}/content`,

  groups: (code: string) => `sessions/${code}/groups`,
  group: (code: string, groupId: string) => `sessions/${code}/groups/${groupId}`,

  students: (code: string) => `sessions/${code}/students`,
  student: (code: string, number: string) => `sessions/${code}/students/${number}`,

  artworks: (code: string) => `sessions/${code}/artworks`,
  artwork: (code: string, artworkId: string) => `sessions/${code}/artworks/${artworkId}`,

  appreciations: (code: string, number: string) =>
    `sessions/${code}/appreciations/${number}`,
  appreciation: (code: string, number: string, artworkId: string) =>
    `sessions/${code}/appreciations/${number}/${artworkId}`,

  auctionItems: (code: string) => `sessions/${code}/auction/items`,
  auctionItem: (code: string, artworkId: string) =>
    `sessions/${code}/auction/items/${artworkId}`,
  bids: (code: string) => `sessions/${code}/auction/bids`,

  results: (code: string) => `sessions/${code}/results`,
  result: (code: string, groupId: string) => `sessions/${code}/results/${groupId}`,
} as const;
