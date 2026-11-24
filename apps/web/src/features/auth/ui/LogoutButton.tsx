'use client';

import { useRouter } from 'next/navigation';
import { apiFetch } from '@/shared/api';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    router.replace('/login');
  }

  return (
    <Button size="sm" onClick={logout}>
      <Icon name="logout" />
      Выйти
    </Button>
  );
}
