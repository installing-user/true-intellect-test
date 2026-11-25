import type { ReviewStatus } from '@/entities/review';

export const PAGE_SIZE = 20;

export const statusFilterLabel: Record<ReviewStatus, string> = {
  new: 'Новые',
  in_progress: 'В работе',
  done: 'Обработанные',
};

export const ratingLabel = ['1 звезда', '2 звезды', '3 звезды', '4 звезды', '5 звёзд'];
