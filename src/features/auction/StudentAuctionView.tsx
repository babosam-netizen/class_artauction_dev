import { useState } from 'react';
import { useRtdbValue } from '@/firebase/hooks';
import { paths } from '@/firebase/paths';
import { placeBid, type BidResult } from './api';
import { setRepresentative } from '@/features/group/api';
import { useCountdown } from './useCountdown';
import type { Artwork, AuctionItem, Group, SessionState } from '@/models';

const C = {
  gold: '#c4975a',
  cream: '#ead9b8',
  creamDim: 'rgba(232,217,184,0.82)',
  wall: 'radial-gradient(ellipse 110% 90% at 50% 28%, #2e1e10 0%, #0c0804 100%)',
};

interface Props {
  code: string;
  studentNumber: string;
  groupId: string;
  artworks: Artwork[];
  minIncrement: number;
  timerSeconds: number;
}

const RESULT_MSG: Record<BidResult, string> = {
  ok: '',
  'too-low': '더 높은 금액을 불러야 해요',
  closed: '지금은 입찰할 수 없어요',
  budget: '남은 예산을 넘었어요',
};

export function StudentAuctionView({
  code,
  studentNumber,
  groupId,
  artworks,
  minIncrement,
  timerSeconds,
}: Props) {
  const state = useRtdbValue<SessionState>(paths.state(code));
  const currentId = state?.currentAuctionArtworkId;
  const item = useRtdbValue<AuctionItem>(currentId ? paths.auctionItem(code, currentId) : null);
  const myGroup = useRtdbValue<Group>(paths.group(code, groupId));
  const groupsMap = useRtdbValue<Record<string, Group>>(paths.groups(code));
  const remaining = useCountdown(item?.timerState === 'running' ? item?.timerEndsAt : undefined);

  const [msg, setMsg] = useState('');
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);

  const artwork = artworks.find((a) => a.id === currentId);
  const amRep = myGroup?.repStudentNumber === studentNumber;
  const budget = myGroup?.remainingBudget ?? 0;
  const price = item?.currentPrice ?? 0;
  const nextBid = price > 0 ? price + minIncrement : minIncrement;
  const highName = item?.highBidGroupId ? groupsMap?.[item.highBidGroupId]?.name : null;

  async function bid(amount: number) {
    setBusy(true);
    setMsg('');
    try {
      const r = await placeBid(code, currentId!, groupId, amount, minIncrement, timerSeconds);
      setMsg(RESULT_MSG[r]);
      if (r === 'ok') setCustom('');
    } finally {
      setBusy(false);
    }
  }

  async function becomeRep() {
    await setRepresentative(code, groupId, studentNumber);
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center font-body" style={{ background: C.wall }}>
      {!currentId || !artwork ? (
        <div className="text-center">
          <div className="font-display text-3xl italic" style={{ color: C.cream }}>
            잠시 후 경매가 시작돼요
          </div>
          <div className="mt-2 text-sm" style={{ color: C.creamDim }}>
            {myGroup?.name} · 남은 예산 {budget.toLocaleString()}원
          </div>
        </div>
      ) : (
        <div className="flex w-full max-w-md flex-col items-center px-6">
          {artwork.imageUrl && (
            <img
              src={artwork.imageUrl}
              alt={artwork.title}
              className="h-44 w-full rounded object-cover"
              style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }}
            />
          )}
          <div className="mt-4 font-display text-2xl italic" style={{ color: C.cream }}>
            {artwork.title}
          </div>

          {/* 현재가 / 타이머 */}
          <div className="mt-4 w-full rounded-lg border p-4 text-center" style={{ borderColor: 'rgba(196,167,90,0.3)' }}>
            <div className="text-xs" style={{ color: C.creamDim }}>현재 최고가</div>
            <div className="font-display text-4xl" style={{ color: C.gold }}>
              {price.toLocaleString()}원
            </div>
            <div className="mt-1 text-xs" style={{ color: C.creamDim }}>
              {item?.status === 'sold'
                ? `🔨 ${highName} 낙찰!`
                : item?.status === 'passed'
                  ? '유찰'
                  : highName
                    ? `최고 입찰: ${highName}`
                    : '아직 입찰이 없어요'}
            </div>
            {item?.timerState === 'running' && (
              <div className="mt-2 font-display text-2xl" style={{ color: remaining <= 3 ? '#e0a0a0' : C.cream }}>
                ⏱ {remaining}
              </div>
            )}
          </div>

          {/* 예산 */}
          <div className="mt-3 text-sm" style={{ color: C.creamDim }}>
            {myGroup?.name} · 남은 예산 <b style={{ color: C.cream }}>{budget.toLocaleString()}원</b>
          </div>

          {/* 입찰 컨트롤 */}
          {item?.status === 'live' ? (
            amRep ? (
              <div className="mt-4 flex w-full flex-col items-center gap-2">
                <button
                  onClick={() => bid(nextBid)}
                  disabled={busy || nextBid > budget}
                  className="w-full rounded-full border py-4 text-lg disabled:opacity-40"
                  style={{ borderColor: C.gold, background: 'rgba(196,167,90,0.18)', color: C.cream }}
                >
                  + {minIncrement.toLocaleString()}원 입찰 ({nextBid.toLocaleString()}원)
                </button>
                <div className="flex w-full gap-2">
                  <input
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    placeholder="직접 입력"
                    inputMode="numeric"
                    className="flex-1 rounded border bg-transparent px-3 py-2 text-center outline-none"
                    style={{ borderColor: 'rgba(196,167,90,0.4)', color: C.cream }}
                  />
                  <button
                    onClick={() => bid(Number(custom) || 0)}
                    disabled={busy || !custom}
                    className="rounded border px-4 disabled:opacity-40"
                    style={{ borderColor: C.gold, color: C.cream }}
                  >
                    입찰
                  </button>
                </div>
                {msg && <div className="text-sm" style={{ color: '#e0a0a0' }}>{msg}</div>}
              </div>
            ) : myGroup?.repStudentNumber ? (
              <div className="mt-4 text-sm" style={{ color: C.creamDim }}>
                대표가 입찰 중이에요. 함께 의논해요!
              </div>
            ) : (
              <button
                onClick={becomeRep}
                className="mt-4 rounded-full border px-6 py-3"
                style={{ borderColor: C.gold, background: 'rgba(196,167,90,0.13)', color: C.cream }}
              >
                우리 모둠 대표로 입찰하기
              </button>
            )
          ) : null}
        </div>
      )}
    </div>
  );
}
