'use client';

import { useApi } from '@/shared/api';
import { queryString } from '@/shared/lib';
import type { Review } from '../model/review';

export interface ReviewFilters {
  companyId: string | null;
  branchId: string | null;
  rating: string | null;
  status: string | null;
  from: string | null;
  to: string | null;
  limit: number;
  offset: number;
}

export function useReviews({ limit, offset, ...filters }: ReviewFilters) {
  return useApi<{ items: Review[]; total: number }>(
    `/api/reviews${queryString({ ...filters, limit: String(limit), offset: String(offset) })}`,
  );
}
