'use client';

import { useApi } from '@/shared/api';
import type { Company } from '../model/company';

export function useCompanies(enabled = true) {
  return useApi<Company[]>(enabled ? '/api/companies' : null);
}
