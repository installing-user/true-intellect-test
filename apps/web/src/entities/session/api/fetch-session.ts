'use client';

import { useApi } from '@/shared/api';
import type { SessionUser } from '../model/session';

export function useCurrentSession() {
  return useApi<SessionUser>('/api/auth/me');
}
