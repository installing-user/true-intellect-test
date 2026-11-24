'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiError, apiFetch } from './client';

interface ApiState<T> {
  data?: T;
  error?: ApiError;
  loading: boolean;
}

export function useApi<T>(url: string | null) {
  const router = useRouter();
  const [state, setState] = useState<ApiState<T>>({ loading: url !== null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (url === null) return;
    const controller = new AbortController();
    setState((s) => ({ data: s.data, loading: true }));
    apiFetch<T>(url, { signal: controller.signal }).then(
      (data) => setState({ data, loading: false }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) {
          router.replace('/login');
          return;
        }
        setState({ error: error instanceof ApiError ? error : new ApiError(0, String(error)), loading: false });
      },
    );
    return () => controller.abort();
  }, [url, attempt, router]);

  return { ...state, refetching: state.loading && state.data !== undefined, retry: () => setAttempt((n) => n + 1) };
}
