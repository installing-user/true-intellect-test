import { Suspense } from 'react';
import { StateMessage } from '@/shared/ui/data-state';
import { Dashboard } from './Dashboard';

export function DashboardPage() {
  return (
    <>
      <h1>Дашборд</h1>
      <Suspense fallback={<StateMessage aria-busy="true">Загрузка…</StateMessage>}>
        <Dashboard />
      </Suspense>
    </>
  );
}
