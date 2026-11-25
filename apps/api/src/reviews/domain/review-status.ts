import type { ReviewStatus as ReviewStatusValue } from 'contracts';

export const ReviewStatus = { New: 'new', InProgress: 'in_progress', Done: 'done' } as const satisfies Record<
  string,
  ReviewStatusValue
>;
export type ReviewStatus = ReviewStatusValue;

export const REVIEW_STATUS_ERROR = 'Неверный статус';
