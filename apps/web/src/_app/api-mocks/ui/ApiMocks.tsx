'use client';

import type { ReactNode } from 'react';
import { MockedApi } from './MockedApi';

export function ApiMocks({ children }: { children: ReactNode }) {
  return process.env.NEXT_PUBLIC_API_MOCKS === '1' ? <MockedApi>{children}</MockedApi> : children;
}
