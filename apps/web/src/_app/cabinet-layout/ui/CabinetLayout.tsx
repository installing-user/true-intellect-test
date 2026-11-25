'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { SessionContext, useCurrentSession } from '@/entities/session';
import { LogoutButton } from '@/features/auth';
import { Brand } from '@/shared/ui/brand';
import { ErrorState } from '@/shared/ui/data-state';
import { CabinetSkeleton } from './CabinetSkeleton';
import './cabinet-layout.css';

const roleLabel = { admin: 'администратор', client: 'клиент' };

export function CabinetLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const me = useCurrentSession();

  if (!me.data) {
    if (!me.error) return <CabinetSkeleton />;

    return (
      <main className="page">
        <ErrorState className="panel" message="Не удалось проверить сессию." onRetry={me.retry} />
      </main>
    );
  }

  return (
    <SessionContext value={me.data}>
      <header className="header">
        <div className="header-inner">
          <Brand />
          <nav className="nav" aria-label="Разделы">
            <Link href="/dashboard" aria-current={pathname === '/dashboard' ? 'page' : undefined}>
              Дашборд
            </Link>
            <Link href="/reviews" aria-current={pathname === '/reviews' ? 'page' : undefined}>
              Отзывы
            </Link>
          </nav>
          <div className="user">
            <span className="user-email">
              {me.data.email} · {roleLabel[me.data.role]}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="page">{children}</main>
    </SessionContext>
  );
}
