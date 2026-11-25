'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function useUrlFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());

    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }

    const query = next.toString();

    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return { params, update };
}

export function queryString(values: Record<string, string | null>): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) if (value) query.set(key, value);
  const text = query.toString();

  return text ? `?${text}` : '';
}
