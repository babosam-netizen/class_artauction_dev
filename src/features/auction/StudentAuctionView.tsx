import { useEffect } from 'react';
import { useRtdbValue } from '@/firebase/hooks';
import { paths } from '@/firebase/paths';
import { setParticipation } from './api';
import { setRepresentative } from '@/features/group/api';
import type { Artwork, AuctionItem, Group, SessionState } from '@/models';

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
  const currentId = state?.currentAuctionArtworkId;
  const item = useRtdbValue<AuctionItem>(currentId ? paths.auctionItem(code, currentId) : null);
  const myGroup = useRtdbValue<Group>(paths.group(code, groupId));
  const groupsMap = useRtdbValue<Record<string, Group>>(paths.groups(code));

  const artwork = artworks.find((a) => a.id === currentId);
  const amRep = myGroup?.repStudentNumber === studentNumber;
  const budget = myGroup?.remainingBudget ?? 0;
  const price = item?.askingPrice ?? 0;
  const amIn = !!(item?.participants && item.participants[groupId]);
  const canAfford = price <= budget;
  const live = item?.status === 'live';

  // 호가가 예산을 넘으면 자동 기권
  useEffect(() => {
    if (live && amIn && !canAfford && amRep && currentId) {
      setParticipation(code, currentId, groupId, false).catch(() => {});
    }
  }, [live, amIn, canAfford, amRep, currentId, code, groupId]);

  function join() {
    if (currentId) setParticipation(code, currentId, groupId, true);
  }
  function concede() {
    if (currentId) setParticipation(code, currentId, groupId, false);
  }

  if (!currentId || !artwork) {
    return (
      <Wall>
        <div className="text-center">
          <div className="font-display text-3xl italic" style={{ color: C.cream }}>잠시 후 경매가 시작돼요</div>
          <div className="mt-2 text-sm" style={{ color: C.creamDim }}>
            {myGroup?.name} · 남은 예산 {budget.toLocaleString()}원
          </div>
        </div>
      </Wall>
    );
  }

  const won = item?.status === 'sold' && item.winnerGroupId === groupId;
  const lost = item?.status === 'sold' && item.winnerGroupId !== groupId;
  const winnerName = item?.winnerGroupId ? groupsMap?.[item.winnerGroupId]?.name : null;

  return (
    <Wall>
      <div className="flex w-full max-w-3xl items-stretch gap-6 px-6">
        {/* 좌: 작품 */}
        <div className="flex w-1/2 flex-col items-center justify-center">
          <img src={artwork.imageUrl} alt={artwork.title} className="w-full rounded object-cover" style={{ maxHeight: '52vh', boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }} />
          <div className="mt-3 text-center font-display text-2xl italic" style={{ color: C.cream }}>{artwork.title}</div>
        </div>

        {/* 우: 호가 + 참여/기권 */}
        <div className="flex w-1/2 flex-col justify-center">
          <div className="rounded-lg border p-3 text-center" style={{ borderColor: 'rgba(196,167,90,0.3)' }}>
            <div className="text-xs" style={{ color: C.creamDim }}>현재 호가</div>
            <div className="font-display text-4xl" style={{ color: C.gold }}>{price.toLocaleString()}원</div>
            <div className="mt-1 text-xs" style={{ color: C.creamDim }}>{myGroup?.name} · 남은 예산 {budget.toLocaleString()}원</div>
          </div>

          {item?.status === 'sold' ? (
            <div className="mt-5 text-center">
              <div className="font-display text-3xl italic" style={{ color: won ? C.green : C.creamDim }}>
                {won ? '🎉 우리 모둠 낙찰!' : `🔨 ${winnerName} 낙찰`}
              </div>
              {lost && <div className="mt-1 text-sm" style={{ color: C.creamDim }}>다음 작품을 기다려요</div>}
            </div>
          ) : item?.status === 'passed' ? (
            <div className="mt-5 text-center font-display text-2xl italic" style={{ color: C.creamDim }}>유찰</div>
          ) : !amRep ? (
            myGroup?.repStudentNumber ? (
              <div className="mt-5 rounded-lg border p-4 text-center text-sm" style={{ borderColor: 'rgba(196,167,90,0.3)', color: C.creamDim }}>
                {amIn ? '우리 모둠 참여 중 ✋' : '대표가 참여/기권을 정해요'}
                <div className="mt-1 text-xs">함께 의논해요!</div>
              </div>
            ) : (
              <button
                onClick={() => setRepresentative(code, groupId, studentNumber)}
                className="mt-5 rounded-2xl border py-5 text-xl"
                style={{ borderColor: C.gold, background: 'rgba(196,167,90,0.15)', color: C.cream }}
              >
                ✋ 우리 모둠 대표하기
              </button>
            )
          ) : (
            <div className="mt-5 flex flex-col gap-3">
              <button
                onClick={join}
                disabled={!canAfford || amIn}
                className="rounded-2xl border py-6 text-2xl font-bold disabled:opacity-50"
                style={{
                  borderColor: amIn ? C.green : C.gold,
                  background: amIn ? 'rgba(143,206,143,0.2)' : 'rgba(196,167,90,0.18)',
                  color: C.cream,
                }}
              >
                {amIn ? '✋ 참여 중' : '✋ 참여 (사겠다)'}
              </button>
              <button
                onClick={concede}
                disabled={!amIn}
                className="rounded-2xl border py-5 text-xl disabled:opacity-40"
                style={{ borderColor: 'rgba(224,160,160,0.5)', color: C.red }}
              >
                🏳️ 기권
              </button>
              {!canAfford && <div className="text-center text-xs" style={{ color: C.red }}>예산을 넘어 참여할 수 없어요</div>}
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
