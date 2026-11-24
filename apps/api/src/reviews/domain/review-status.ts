export const ReviewStatus = { New: 'new', InProgress: 'in_progress', Done: 'done' } as const;
export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];

export const REVIEW_STATUS_ERROR = 'Неверный статус';
