import { Period } from '../../shared/domain/period.js';
import { ReviewStatus } from './review-status.js';

export interface ReviewFilter {
  rating: number | null;
  status: ReviewStatus | null;
  period: Period | null;
  limit: number;
  offset: number;
}
