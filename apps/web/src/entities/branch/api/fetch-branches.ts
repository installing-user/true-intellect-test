'use client';

import { useApi } from '@/shared/api';
import { queryString } from '@/shared/lib';
import type { Branch } from '../model/branch';

export function useBranches({ companyId, enabled = true }: { companyId: string | null; enabled?: boolean }) {
  return useApi<Branch[]>(enabled ? `/api/branches${queryString({ companyId })}` : null);
}
