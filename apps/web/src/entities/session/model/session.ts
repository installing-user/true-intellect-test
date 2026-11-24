'use client';

import { createContext, useContext } from 'react';

export interface SessionUser {
  id: number;
  email: string;
  role: 'admin' | 'client';
  companyId: number | null;
}

export const SessionContext = createContext<SessionUser | null>(null);

export function useSession(): SessionUser {
  const user = useContext(SessionContext);
  if (!user) throw new Error('useSession outside of cabinet layout');
  return user;
}
