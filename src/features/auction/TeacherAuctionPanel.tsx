import { useState } from 'react';
import { useRtdbValue, useRtdbList } from '@/firebase/hooks';
import { paths } from '@/firebase/paths';
import { initAuction, presentArtwork, raisePrice, award, passItem, reauction, participantIds, highestBid } from './api';
import { setAuctionMode } from '@/features/session/api';
import { sortByOrder } from '@/features/artwork/api';
import { formatWon } from '@/utils/format';
import type { Artwork, AuctionItem, AuctionMode, Group, SessionMeta, SessionState } from '@/models';

const GOLD = '#c4975a';
const GREEN = '#8fce8f';

interface Props {
  code: string;
  meta: SessionMeta;
}

const MODE_LABEL: Record<AuctionMode, string> = {
  live: '호가 주도',
  sealed: '입찰경매',
  manual: '수동 기록',
};

export function TeacherAuctionPanel({ code, meta }: Props) {
  const items = sortByOrder(useRtdbList<AuctionItem>(paths.auctionItems(code)));
  const artworks = useRtdbList<Artwork>(paths.artworks(code));
  const state = useRtdbValue<SessionState>(paths.state(code));
  const groupsMap = useRtdbValue<Record<string, Group>>(paths.groups(code)) ?? {};
  const [manualPrice, setManualPrice] = useState('');
  const [manualGroup, setManualGroup] = useState('');
  const [startPriceInput, setStartPriceInput] = useState('');

  const mode = meta.auctionMode ?? 'live';
  const currentId = state?.currentAuctionArtworkId;
  const current = items.find((i) => i.artworkId === currentId);
  const title = (id: string) => artworks.find((a) => a.id === id)?.title ?? id;
  const groupName = (id: string) => groupsMap[id]?.name ?? id;
  const allGroups = Object.values(groupsMap).sort((a, b) => a.name.localeCompare(b.name));

  const forAuctionCount = artworks.filter((a) => a.forAuction).length;
  const inIds = participantIds(current);
  const top = highestBid(current);
  const liveOngoing = current && current.status === 'live';
  const soldCount = items.filter((i) => i.status === 'sold').length;
  const remainCount = items.filter((i) => i.status === 'pending' || i.status === 'passed').length;
  const startFor = mode === 'sealed' ? 0 : (Number(startPriceInput) || 0);

  return (
    <div className="w-full rounded-lg border p-5 text-left" style={{ borderColor: 'rgba(196,167,90,0.2)', background: 'rgba(28,18,10,0.6)' }}>
      <div className="mb-2 text-sm font-medium" style={{ color: GOLD }}>경매 진행 ({items.length})</div>

      {/* 경매 방식 선택 */}
      <div className="mb-2 flex gap-1.5">
        {(['live', 'sealed', 'manual'] as AuctionMode[]).map((m) => (
          <button key={m} onClick={() => setAuctionMode(code, m)} className="flex-1 rounded-full border py-1.5 text-xs" style={{ borderColor: mode === m ? GOLD : 'rgba(196,167,90,0.25)', background: mode === m ? GOLD : 'transparent', color: mode === m ? '#130e08' : '#ead9b8', fontWeight: mode === m ? 700 : 400 }}>
            {MODE_LABEL[m]}
          </button>
        ))}
      </div>
      <div className="mb-3 rounded px-2 py-1.5 text-[11px]" style={{ background: 'rgba(196,167,90,0.08)', color: 'rgba(232,217,184,0.7)' }}>
        {mode === 'live' && '호가 올리기 → 모둠 참여/기권 → 1팀 남으면 낙찰'}
        {mode === 'sealed' && '모둠이 금액 입찰 → 입찰 내역·최고가 확인 → 낙찰 확정'}
        {mode === 'manual' && '교실에서 호가경매 진행 → 낙찰가·낙찰모둠을 기록'}
      </div>

      {items.length === 0 &&
        (forAuctionCount === 0 ? (
          <div className="rounded border p-3 text-xs" style={{ borderColor: 'rgba(224,160,160,0.4)', color: 'rgba(224,160,160,0.9)' }}>
            경매 대상 작품이 없어요. "작품 관리"에서 <b>선택작품감상실(경매)</b> 작품을 올리거나 <b>경매 대상</b>을 체크하세요.
          </div>
        ) : (
          <button onClick={() => initAuction(code, artworks)} className="w-full rounded-full border py-2.5 text-sm" style={{ borderColor: GOLD, background: 'rgba(196,167,90,0.15)', color: '#ead9b8' }}>
            경매 초기화 — 경매 대상 {forAuctionCount}점 (랜덤 순서)
          </button>
        ))}

      {current && (
        <div className="mb-4 rounded border p-3" style={{ borderColor: 'rgba(196,167,90,0.3)' }}>
          <div className="flex items-baseline justify-between">
            <div className="font-display text-lg italic" style={{ color: '#ead9b8' }}>{title(current.artworkId)}</div>
            {mode !== 'sealed' && <div className="font-display text-xl" style={{ color: GOLD }}>{formatWon(current.askingPrice)}</div>}
          </div>

          {current.status === 'sold' ? (
            <div className="mt-1 text-sm" style={{ color: GREEN }}>🔨 {groupName(current.winnerGroupId ?? '')} 낙찰 ({formatWon(current.askingPrice)})</div>
          ) : current.status === 'passed' ? (
            <>
              <div className="mt-1 text-sm" style={{ color: 'rgba(232,217,184,0.6)' }}>유찰</div>
              <button onClick={() => reauction(code, current.artworkId)} className="mt-2 rounded-full border px-4 py-1.5 text-xs" style={{ borderColor: GOLD, color: '#ead9b8' }}>재경매</button>
            </>
          ) : mode === 'live' ? (
            <>
              <div className="mt-2 text-[11px]" style={{ color: 'rgba(232,217,184,0.6)' }}>참여 {inIds.length}팀</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {allGroups.map((g) => {
                  const isIn = inIds.includes(g.id);
                  return <span key={g.id} className="rounded-full px-2.5 py-1 text-xs" style={{ background: isIn ? 'rgba(143,206,143,0.18)' : 'transparent', border: `1px solid ${isIn ? GREEN : 'rgba(196,167,90,0.25)'}`, color: isIn ? '#ead9b8' : 'rgba(232,217,184,0.4)' }}>{isIn ? '✋ ' : ''}{g.name}</span>;
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {([100_000_000, 500_000_000, 1_000_000_000] as const).map((inc) => (
                  <button key={inc} onClick={() => raisePrice(code, current.artworkId, inc)} className="rounded-full border px-4 py-1.5 text-xs" style={{ borderColor: GOLD, background: 'rgba(196,167,90,0.13)', color: '#ead9b8' }}>+{formatWon(inc)}</button>
                ))}
                {inIds.length === 1 ? (
                  <button onClick={() => award(code, current.artworkId, inIds[0], current.askingPrice)} className="rounded-full border px-4 py-1.5 text-xs" style={{ borderColor: GREEN, background: 'rgba(143,206,143,0.18)', color: '#ead9b8' }}>🔨 {groupName(inIds[0])} 낙찰</button>
                ) : inIds.length === 0 ? (
                  <button onClick={() => passItem(code, current.artworkId)} className="rounded-full border px-4 py-1.5 text-xs" style={{ borderColor: 'rgba(196,167,90,0.4)', color: '#ead9b8' }}>유찰 처리</button>
                ) : (
                  <span className="self-center text-[11px]" style={{ color: 'rgba(232,217,184,0.6)' }}>참여 1팀이 될 때까지 호가를 올리세요</span>
                )}
              </div>
            </>
          ) : mode === 'sealed' ? (
            <>
              <div className="mt-2 text-[11px]" style={{ color: 'rgba(232,217,184,0.6)' }}>입찰 내역 ({current.bids ? Object.keys(current.bids).length : 0}팀)</div>
              <div className="mt-1 flex flex-col gap-1">
                {Object.entries(current.bids ?? {}).sort((a, b) => b[1] - a[1]).map(([g, amt], i) => (
                  <div key={g} className="flex justify-between rounded px-2 py-1 text-sm" style={{ background: i === 0 ? 'rgba(143,206,143,0.15)' : 'rgba(196,167,90,0.06)', color: '#ead9b8' }}>
                    <span>{i === 0 ? '🏆 ' : ''}{groupName(g)}</span>
                    <span style={{ color: i === 0 ? GREEN : GOLD }}>{formatWon(amt)}</span>
                  </div>
                ))}
                {!current.bids && <div className="text-[11px]" style={{ color: 'rgba(232,217,184,0.4)' }}>아직 입찰이 없어요</div>}
              </div>
              <div className="mt-3 flex gap-2">
                {top ? (
                  <button onClick={() => award(code, current.artworkId, top.groupId, top.amount)} className="rounded-full border px-4 py-1.5 text-xs" style={{ borderColor: GREEN, background: 'rgba(143,206,143,0.18)', color: '#ead9b8' }}>🔨 최고가 낙찰 ({groupName(top.groupId)} · {formatWon(top.amount)})</button>
                ) : (
                  <button onClick={() => passItem(code, current.artworkId)} className="rounded-full border px-4 py-1.5 text-xs" style={{ borderColor: 'rgba(196,167,90,0.4)', color: '#ead9b8' }}>유찰 처리</button>
                )}
              </div>
            </>
          ) : (
            // manual
            <>
              <div className="mt-2 text-[11px]" style={{ color: 'rgba(232,217,184,0.6)' }}>교실에서 진행한 결과를 기록하세요</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select value={manualGroup} onChange={(e) => setManualGroup(e.target.value)} className="rounded border bg-transparent px-2 py-1.5 text-sm outline-none" style={{ borderColor: 'rgba(196,167,90,0.4)', color: '#ead9b8', background: '#1c120a' }}>
                  <option value="">낙찰 모둠</option>
                  {allGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <input value={manualPrice} onChange={(e) => setManualPrice(e.target.value)} placeholder="낙찰가(원)" inputMode="numeric" className="w-28 rounded border bg-transparent px-2 py-1.5 text-sm outline-none" style={{ borderColor: 'rgba(196,167,90,0.4)', color: '#ead9b8' }} />
                <button
                  onClick={() => { if (manualGroup && Number(manualPrice) > 0) { award(code, current.artworkId, manualGroup, Number(manualPrice)); setManualGroup(''); setManualPrice(''); } }}
                  disabled={!manualGroup || !(Number(manualPrice) > 0)}
                  className="rounded-full border px-4 py-1.5 text-xs disabled:opacity-40"
                  style={{ borderColor: GREEN, background: 'rgba(143,206,143,0.18)', color: '#ead9b8' }}
                >
                  🔨 낙찰 기록
                </button>
                <button onClick={() => passItem(code, current.artworkId)} className="rounded-full border px-3 py-1.5 text-xs" style={{ borderColor: 'rgba(196,167,90,0.4)', color: '#ead9b8' }}>유찰</button>
              </div>
            </>
          )}
        </div>
      )}

      {items.length > 0 && !liveOngoing && mode !== 'sealed' && (
        <div className="mb-2">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs whitespace-nowrap" style={{ color: 'rgba(232,217,184,0.7)' }}>시작 호가</span>
            <input
              value={startPriceInput}
              onChange={(e) => setStartPriceInput(e.target.value)}
              placeholder="0 (0원 시작)"
              inputMode="numeric"
              className="min-w-0 flex-1 rounded border bg-transparent px-2 py-1 text-xs outline-none"
              style={{ borderColor: 'rgba(196,167,90,0.4)', color: '#ead9b8' }}
            />
            {startPriceInput ? (
              <span className="text-xs whitespace-nowrap font-medium" style={{ color: GOLD }}>{formatWon(Number(startPriceInput))}</span>
            ) : (
              <span className="text-xs whitespace-nowrap" style={{ color: 'rgba(232,217,184,0.35)' }}>0원</span>
            )}
          </div>
          <div className="flex gap-1">
            {[1, 5, 10, 30, 50].map((eok) => (
              <button key={eok} onClick={() => setStartPriceInput(String(eok * 100_000_000))} className="flex-1 rounded border py-1 text-[11px]" style={{ borderColor: 'rgba(196,167,90,0.3)', color: 'rgba(232,217,184,0.7)' }}>{eok}억</button>
            ))}
          </div>
        </div>
      )}
      {items.length > 0 && !liveOngoing && mode === 'sealed' && (
        <div className="mb-2 text-xs" style={{ color: 'rgba(232,217,184,0.7)' }}>
          아래 목록에서 작품을 <b style={{ color: GOLD }}>올리기</b> 하면 경매가 시작됩니다.
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {items.map((it) => (
          <div key={it.artworkId} className="flex items-center justify-between rounded border px-3 py-2 text-sm" style={{ borderColor: it.artworkId === currentId ? GOLD : 'rgba(196,167,90,0.15)' }}>
            <span style={{ color: '#ead9b8' }}>
              {title(it.artworkId)}{' '}
              <span style={{ color: 'rgba(196,167,90,0.6)' }}>
                {it.status === 'sold' ? `· 낙찰 ${formatWon(it.askingPrice)}` : it.status === 'passed' ? '· 유찰' : it.status === 'live' ? '· 진행 중' : ''}
              </span>
            </span>
            {(it.status === 'pending' || it.status === 'passed') && !liveOngoing && (
              <button onClick={() => presentArtwork(code, it.artworkId, startFor)} className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: GOLD, color: '#ead9b8' }}>올리기</button>
            )}
          </div>
        ))}
      </div>

      {items.length > 0 && (
        <div className="mt-3 text-[11px]" style={{ color: 'rgba(232,217,184,0.6)' }}>
          낙찰 {soldCount} · 남음 {remainCount}{remainCount === 0 && ' · 경매 종료 → 결과 단계로'}
        </div>
      )}
    </div>
  );
}
