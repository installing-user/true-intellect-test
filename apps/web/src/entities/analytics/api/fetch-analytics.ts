'use client';

import { useApi } from '@/shared/api';
import { queryString } from '@/shared/lib';
import type { Analytics } from '../model/analytics';

export interface AnalyticsFilters {
  companyId: string | null;
  branchId: string | null;
  from: string | null;
  to: string | null;
}

export function useAnalytics(filters: AnalyticsFilters) {
  return useApi<Analytics>(`/api/analytics${queryString({ ...filters })}`);
}
