// RTDB 경로 헬퍼 — 오타 방지를 위한 단일 소스 (PRD §6 트리 레이아웃)

export const paths = {
  sessionsRoot: () => 'sessions',
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

  allAppreciations: (code: string) => `sessions/${code}/appreciations`,
  appreciations: (code: string, number: string) =>
    `sessions/${code}/appreciations/${number}`,
  appreciation: (code: string, number: string, artworkId: string) =>
    `sessions/${code}/appreciations/${number}/${artworkId}`,

  // 감상/선택 보상 장부 (학생·작품별 1회 지급 기록)
  rewards: (code: string, number: string) => `sessions/${code}/rewards/${number}`,
  reward: (code: string, number: string, artworkId: string) =>
    `sessions/${code}/rewards/${number}/${artworkId}`,

  auctionItems: (code: string) => `sessions/${code}/auction/items`,
  auctionItem: (code: string, artworkId: string) =>
    `sessions/${code}/auction/items/${artworkId}`,
  bids: (code: string) => `sessions/${code}/auction/bids`,

  results: (code: string) => `sessions/${code}/results`,
  result: (code: string, groupId: string) => `sessions/${code}/results/${groupId}`,
} as const;
