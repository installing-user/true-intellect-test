'use client';

import { useEffect } from 'react';
import { useBranches } from '@/entities/branch';
import { useCompanies } from '@/entities/company';
import { ReviewCard, type ReviewStatus, statusLabel, useReviews } from '@/entities/review';
import { useSession } from '@/entities/session';
import { ReviewStatusSelect } from '@/features/change-review-status';
import { useUrlFilters } from '@/shared/lib';
import { Button } from '@/shared/ui/button';
import { DataState, EmptyState } from '@/shared/ui/data-state';
import { Icon } from '@/shared/ui/icon';
import { Panel, PanelHead } from '@/shared/ui/panel';
import { Select } from '@/shared/ui/select';
import { ReviewsSkeleton } from './ReviewsSkeleton';
import './reviews.css';

const PAGE_SIZE = 20;

const statusFilterLabel: Record<ReviewStatus, string> = {
  new: 'Новые',
  in_progress: 'В работе',
  done: 'Обработанные',
};

const ratingLabel = ['1 звезда', '2 звезды', '3 звезды', '4 звезды', '5 звёзд'];

export function Reviews() {
  const user = useSession();
  const { params, update } = useUrlFilters();
  const companyId = params.get('companyId');
  const branchId = params.get('branchId');
  const rating = params.get('rating');
  const status = params.get('status');
  const from = params.get('from');
  const to = params.get('to');
  const pageParam = Number(params.get('page'));
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const companies = useCompanies(user.role === 'admin');
  const branches = useBranches({ companyId });
  const reviews = useReviews({ companyId, branchId, rating, status, from, to, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });

  const total = reviews.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageOutOfRange = reviews.data !== undefined && !reviews.loading && total > 0 && page > pages;

  useEffect(() => {
    if (pageOutOfRange) update({ page: pages > 1 ? String(pages) : null });
  }, [pageOutOfRange]); // update is a new closure on every render, so it stays out of the deps

  const setFilter = (name: string, value: string) => update({ [name]: value, page: null });

  return (
    <div className="rv stagger">
      <Panel as="section" aria-label="Фильтры">
        <PanelHead>
          <h2>Фильтры</h2>
        </PanelHead>
        <div className={user.role === 'admin' ? 'rv-filters rv-filters-admin' : 'rv-filters'}>
          {user.role === 'admin' && (
            <Select
              className="rv-wide"
              label="Компания"
              value={companyId ?? ''}
              onChange={(value) => update({ companyId: value, branchId: null, page: null })}
              disabled={!companies.data}
              options={[{ value: '', label: 'Все компании' }, ...(companies.data ?? []).map((c) => ({ value: String(c.id), label: c.name }))]}
            />
          )}
          <Select
            className="rv-wide rv-branch"
            label="Филиал"
            value={branchId ?? ''}
            onChange={(value) => setFilter('branchId', value)}
            disabled={!branches.data}
            options={[{ value: '', label: 'Все филиалы' }, ...(branches.data ?? []).map((b) => ({ value: String(b.id), label: b.name }))]}
          />
          <Select
            label="Оценка"
            value={rating ?? ''}
            onChange={(value) => setFilter('rating', value)}
            options={[{ value: '', label: 'Все оценки' }, ...ratingLabel.map((label, i) => ({ value: String(i + 1), label }))]}
          />
          <Select
            label="Статус"
            value={status ?? ''}
            onChange={(value) => setFilter('status', value)}
            options={[{ value: '', label: 'Все статусы' }, ...Object.entries(statusFilterLabel).map(([value, label]) => ({ value, label }))]}
          />
        </div>
      </Panel>

      <section className="rv-results" aria-label="Список отзывов">
        <DataState
          state={reviews}
          notFound="Филиал не найден"
          skeleton={<ReviewsSkeleton />}
          onReset={() => update({ companyId: null, branchId: null, rating: null, status: null, from: null, to: null, page: null })}>
          {(data) => {
            if (pageOutOfRange) return null;
            if (data.items.length === 0) return <EmptyState>Отзывов не найдено</EmptyState>;
            return (
              <>
                <ul className="rv-list stagger">
                  {data.items.map((review) => (
                    <ReviewCard key={review.id} review={review} actions={<ReviewStatusSelect review={review} />} />
                  ))}
                </ul>
                <nav className="rv-pager" aria-label="Страницы">
                  <Button disabled={page <= 1} onClick={() => update({ page: page > 2 ? String(page - 1) : null })}>
                    <Icon name="chevronLeft" />
                    Назад
                  </Button>
                  <span className="rv-count">
                    Страница {page} из {pages} · всего {data.total}
                  </span>
                  <Button disabled={page >= pages} onClick={() => update({ page: String(page + 1) })}>
                    Вперёд
                    <Icon name="chevronRight" />
                  </Button>
                </nav>
              </>
            );
          }}
        </DataState>
      </section>
    </div>
  );
}
