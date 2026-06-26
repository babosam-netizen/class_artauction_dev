/** 원 단위 정수 */
export type Won = number;
/** Date.now() epoch ms */
export type Timestamp = number;

export type GradeBand = '3-4' | '5-6';

/** 교사가 전환하는 단계 = 학생 접근 게이트 (source of truth) */
export type Phase = 'lobby' | 'prologue' | 'gallery' | 'branch' | 'auction' | 'result';

export type GroupAssignMode = 'preset' | 'studentChoice';
