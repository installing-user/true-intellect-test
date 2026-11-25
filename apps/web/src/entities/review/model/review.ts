import type { IconName } from '@/shared/ui/icon';

export type ReviewStatus = 'new' | 'in_progress' | 'done';

export interface Review {
  id: number;
  branchId: number;
  branchName: string;
  authorName: string;
  rating: number;
  text: string;
  status: ReviewStatus;
  publishedAt: string;
}

export const statusLabel: Record<ReviewStatus, string> = {
  new: 'Новый',
  in_progress: 'В работе',
  done: 'Обработан',
};

export const statusIcon: Record<ReviewStatus, IconName> = {
  new: 'dot',
  in_progress: 'half',
  done: 'check',
};
