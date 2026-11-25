import { type APIRequestContext, expect, request } from '@playwright/test';
import type { Branch } from 'contracts';
import type { UserKey } from './users';

export const stateFile = (user: UserKey) => `e2e/.auth/${user}.json`;

export async function apiAs(user: UserKey, baseURL: string | undefined): Promise<APIRequestContext> {
  return request.newContext({ baseURL, storageState: stateFile(user) });
}

export async function getJson<T>(api: APIRequestContext, url: string): Promise<T> {
  const res = await api.get(url);

  expect(res.status(), url).toBe(200);

  return (await res.json()) as T;
}

export async function companyOf(user: 'north' | 'gaika', baseURL: string | undefined) {
  const api = await apiAs(user, baseURL);
  const me = await getJson<{ companyId: number }>(api, '/api/auth/me');
  const branches = await getJson<Branch[]>(api, '/api/branches');

  await api.dispose();

  return { companyId: me.companyId, branches };
}
