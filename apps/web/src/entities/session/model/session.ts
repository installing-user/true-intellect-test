'use client';

import type { SessionUser } from 'contracts';
import { createContext, useContext } from 'react';

export type { SessionUser };

export const SessionContext = createContext<SessionUser | null>(null);

export function useSession(): SessionUser {
  const user = useContext(SessionContext);

  if (!user) throw new Error('useSession outside of cabinet layout');

  return user;
}
