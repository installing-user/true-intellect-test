import type { AnalyticsReport, Counter } from 'contracts';
import type { PluralForms } from '@/shared/lib';

export type { Counter };
export type Analytics = AnalyticsReport;

export const counters: Record<Counter, string> = {
  views: 'Просмотры карточек',
  siteClicks: 'Переходы на сайт',
  calls: 'Звонки',
  routes: 'Маршруты',
};

export const counterUnits: Record<Counter, PluralForms> = {
  views: ['просмотр', 'просмотра', 'просмотров'],
  siteClicks: ['переход', 'перехода', 'переходов'],
  calls: ['звонок', 'звонка', 'звонков'],
  routes: ['маршрут', 'маршрута', 'маршрутов'],
};

export function isCounter(value: string | null): value is Counter {
  return value !== null && value in counters;
}
