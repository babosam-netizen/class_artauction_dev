import { useState, useEffect } from 'react';
import { useRtdbValue } from '@/firebase/hooks';
import { paths } from '@/firebase/paths';
import { setParticipation, submitBid } from './api';
import { setRepresentative } from '@/features/group/api';
import { formatWon } from '@/utils/format';
import type { Artwork, AuctionItem, Group, SessionMeta, SessionState } from '@/models';

const C = {
  gold: '#c4975a',
  cream: '#ead9b8',
  creamDim: 'rgba(232,217,184,0.82)',
  green: '#8fce8f',
  red: '#e0a0a0',
  wall: 'radial-gradient(ellipse 110% 90% at 50% 28%, #2e1e10 0%, #0c0804 100%)',
};

interface Props {
  code: string;
  studentNumber: string;
  groupId: string;
  artworks: Artwork[];
}

export function StudentAuctionView({ code, studentNumber, groupId, artworks }: Props) {
  const state = useRtdbValue<SessionState>(paths.state(code));
  const meta = useRtdbValue<SessionMeta>(paths.meta(code));
  const currentId = state?.currentAuctionArtworkId;
  const item = useRtdbValue<AuctionItem>(currentId ? paths.auctionItem(code, currentId) : null);
  const myGroup = useRtdbValue<Group>(paths.group(code, groupId));
  const groupsMap = useRtdbValue<Record<string, Group>>(paths.groups(code));

  const mode = meta?.auctionMode ?? 'live';
  const artwork = artworks.find((a) => a.id === currentId);
  const amRep = myGroup?.repStudentNumber === studentNumber;
  const hasRep = !!myGroup?.repStudentNumber;
  const budget = myGroup?.remainingBudget ?? 0;
  const baseFunds = meta?.startingFunds ?? 0;
  const rewardTotal = myGroup?.rewardTotal ?? 0;
  const price = item?.askingPrice ?? 0;
  const amIn = !!(item?.participants && item.participants[groupId]);
  const myBid = item?.bids?.[groupId] ?? 0;
  const live = item?.status === 'live';
  const [bidInput, setBidInput] = useState('');

  // 호가 모드: 호가가 예산 넘으면 자동 기권
  useEffect(() => {
    if (mode === 'live' && live && amIn && price > budget && amRep && currentId) {
      setParticipation(code, currentId, groupId, false).catch(() => {});
    }
  }, [mode, live, amIn, price, budget, amRep, currentId, code, groupId]);

  if (!currentId || !artwork) {
    return (
      <Wall>
        <div className="text-center">
          <div className="font-display text-3xl italic" style={{ color: C.cream }}>잠시 후 경매가 시작돼요</div>
          <div className="mt-2 text-sm" style={{ color: C.creamDim }}>{myGroup?.name} · 경매자금 {formatWon(budget)}</div>
          {rewardTotal > 0 && (
            <div className="mt-1 text-xs" style={{ color: 'rgba(196,167,90,0.7)' }}>
              기본 {formatWon(baseFunds)} + 감상 사례금 {formatWon(rewardTotal)}
            </div>
          )}
        </div>
      </Wall>
    );
  }

  const won = item?.status === 'sold' && item.winnerGroupId === groupId;
  const winnerName = item?.winnerGroupId ? groupsMap?.[item.winnerGroupId]?.name : null;

  function becomeRep() { setRepresentative(code, groupId, studentNumber); }

  return (
    <Wall>
      <div className="flex w-full max-w-3xl items-stretch gap-6 px-6">
        <div className="flex w-1/2 flex-col items-center justify-center">
          <img src={artwork.imageUrl} alt={artwork.title} className="w-full rounded object-contain" style={{ maxHeight: '60vh', boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }} />
          <div className="mt-3 text-center font-display text-2xl italic" style={{ color: C.cream }}>{artwork.title}</div>
        </div>

        <div className="flex w-1/2 flex-col justify-center">
          <div className="rounded-lg border p-3 text-center" style={{ borderColor: 'rgba(196,167,90,0.3)' }}>
            <div className="text-xs" style={{ color: C.creamDim }}>{mode === 'sealed' ? '입찰경매' : '현재 호가'}</div>
            {mode !== 'sealed' && <div className="font-display text-4xl" style={{ color: C.gold }}>{formatWon(price)}</div>}
            <div className="mt-1 text-xs" style={{ color: C.creamDim }}>{myGroup?.name} · 남은 예산 {formatWon(budget)}</div>
            {rewardTotal > 0 && (
              <div className="text-[11px]" style={{ color: 'rgba(196,167,90,0.7)' }}>
                기본 {formatWon(baseFunds)} + 사례금 {formatWon(rewardTotal)}
              </div>
            )}
          </div>

          {item?.status === 'sold' ? (
            <div className="mt-5 text-center font-display text-3xl italic" style={{ color: won ? C.green : C.creamDim }}>
              {won ? '🎉 우리 모둠 낙찰!' : `🔨 ${winnerName} 낙찰`}
            </div>
          ) : item?.status === 'passed' ? (
            <div className="mt-5 text-center font-display text-2xl italic" style={{ color: C.creamDim }}>유찰</div>
          ) : mode === 'manual' ? (
            <div className="mt-5 rounded-lg border p-4 text-center text-sm" style={{ borderColor: 'rgba(196,167,90,0.3)', color: C.creamDim }}>
              선생님이 진행하는 경매예요.<br />손을 들어 참여하세요! ✋
            </div>
          ) : !amRep ? (
            hasRep ? (
              <div className="mt-5 rounded-lg border p-4 text-center text-sm" style={{ borderColor: 'rgba(196,167,90,0.3)', color: C.creamDim }}>
                대표가 진행 중이에요. 함께 의논해요!
              </div>
            ) : (
              <button onClick={becomeRep} className="mt-5 rounded-2xl border py-5 text-xl" style={{ borderColor: C.gold, background: 'rgba(196,167,90,0.15)', color: C.cream }}>✋ 우리 모둠 대표하기</button>
            )
          ) : mode === 'sealed' ? (
            <div className="mt-5 flex flex-col gap-2">
              <div className="text-center text-sm" style={{ color: C.creamDim }}>
                {myBid > 0 ? `제출한 입찰: ${formatWon(myBid)}` : '얼마에 사겠어요?'}
              </div>
              <input value={bidInput} onChange={(e) => setBidInput(e.target.value)} placeholder="입찰 금액(원)" inputMode="numeric" className="rounded border bg-transparent px-3 py-3 text-center text-lg outline-none" style={{ borderColor: 'rgba(196,167,90,0.4)', color: C.cream }} />
              <button
                onClick={() => { const n = Number(bidInput); if (n > 0 && n <= budget && currentId) { submitBid(code, currentId, groupId, n); setBidInput(''); } }}
                disabled={!(Number(bidInput) > 0) || Number(bidInput) > budget}
                className="rounded-2xl border py-4 text-lg disabled:opacity-40"
                style={{ borderColor: C.gold, background: 'rgba(196,167,90,0.18)', color: C.cream }}
              >
                {myBid > 0 ? '입찰 수정' : '입찰 제출'}
              </button>
              {Number(bidInput) > budget && <div className="text-center text-xs" style={{ color: C.red }}>예산을 넘었어요</div>}
            </div>
          ) : (
            // live (호가 주도)
            <div className="mt-5 flex flex-col gap-3">
              <button onClick={() => currentId && setParticipation(code, currentId, groupId, true)} disabled={price > budget || amIn} className="rounded-2xl border py-6 text-2xl font-bold disabled:opacity-50" style={{ borderColor: amIn ? C.green : C.gold, background: amIn ? 'rgba(143,206,143,0.2)' : 'rgba(196,167,90,0.18)', color: C.cream }}>
                {amIn ? '✋ 참여 중' : '✋ 참여 (사겠다)'}
              </button>
              <button onClick={() => currentId && setParticipation(code, currentId, groupId, false)} disabled={!amIn} className="rounded-2xl border py-5 text-xl disabled:opacity-40" style={{ borderColor: 'rgba(224,160,160,0.5)', color: C.red }}>🏳️ 기권</button>
              {price > budget && <div className="text-center text-xs" style={{ color: C.red }}>예산을 넘어 참여할 수 없어요</div>}
            </div>
          )}
        </div>
      </div>
    </Wall>
  );
}

function Wall({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen items-center justify-center font-body" style={{ background: C.wall }}>
      {children}
    </div>
  );
}
