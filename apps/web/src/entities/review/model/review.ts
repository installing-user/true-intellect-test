import type { Review, ReviewStatus } from 'contracts';
import type { IconName } from '@/shared/ui/icon';

export type { Review, ReviewStatus };

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
