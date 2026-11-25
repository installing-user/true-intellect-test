'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { startMocks } from '@/shared/api/mocks/browser';

// once per page: Strict Mode runs effects twice, and a second worker.start() throws
let started: Promise<unknown> | undefined;

export function MockedApi({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    started ??= startMocks();
    started.then(
      () => setReady(true),
      (error: unknown) => console.error('API mocks failed to start', error),
    );
  }, []);

  return ready ? children : null;
}
