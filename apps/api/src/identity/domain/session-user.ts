export type Role = 'admin' | 'client';

export interface SessionUser {
  id: number;
  email: string;
  role: Role;
  companyId: number | null;
}
