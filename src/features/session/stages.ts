import type { Phase } from '@/models';
import { PHASE_ORDER, PHASE_LABELS } from './api';

/** 각 단계의 하위 과정(안내용). 교사가 흐름을 한눈에 이해하도록. */
export const PHASE_SUBSTAGES: Record<Phase, string[]> = {
  lobby: ['학생 입장 대기'],
  prologue: ['서사 1', '서사 2', '서사 3', '건너뛰기 가능'],
  gallery: ['공통 작품 감상', '질문에 답하기', '작품 해설 보기'],
  branch: ['작품 1점 선택', '감상 작성', '제출 후 경매 대기'],
  auction: ['작품 올리기(랜덤)', '실시간 호가', '타이머 마감 → 낙찰/유찰'],
  result: ['모둠 자산 순위', '실제 감정가 공개', '마무리 토론'],
};

export const PHASE_HINT: Record<Phase, string> = {
  lobby: '학생들이 코드로 입장하고 모둠을 정하는 중입니다.',
  prologue: '학년에 맞는 이야기로 활동 동기를 부여합니다.',
  gallery: '공통 작품을 감상하고 질문에 답합니다(수행평가 대상).',
  branch: '여러 작품 중 1점을 골라 감상하고 경매를 기다립니다.',
  auction: '모둠 대표가 실시간으로 호가하며 작품을 낙찰합니다.',
  result: '남은 돈 + 낙찰작 감정가로 자산 순위를 공개합니다.',
};

export { PHASE_ORDER, PHASE_LABELS };
