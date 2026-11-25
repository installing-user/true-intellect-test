import { Suspense } from 'react';
import { StateMessage } from '@/shared/ui/data-state';
import { Reviews } from './Reviews';

export function ReviewsPage() {
  return (
    <>
      <h1>Отзывы</h1>
      <Suspense fallback={<StateMessage aria-busy="true">Загрузка…</StateMessage>}>
        <Reviews />
      </Suspense>
    </>
  );
}
