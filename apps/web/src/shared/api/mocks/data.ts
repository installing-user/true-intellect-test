import type { Branch, Company, DayMetrics, Review, ReviewStatus, SessionUser } from 'contracts';

export const DEMO_PASSWORD = 'demo-password';
export const DAY_MS = 86_400_000;
const DAYS = 90;

const seed = [
  {
    name: 'Кофейни «Северный ветер»',
    user: 'north@demo.test',
    branches: [
      ['Северный ветер на Ясной', 'г. Светлогорск-на-Неве, ул. Ясная, 12'],
      ['Северный ветер у парка', 'г. Светлогорск-на-Неве, Парковый пр., 3'],
      ['Северный ветер на вокзале', 'г. Светлогорск-на-Неве, Вокзальная пл., 1'],
    ],
  },
  {
    name: 'Автосервис «Гайка»',
    user: 'gaika@demo.test',
    branches: [
      ['Гайка на Кольцевой', 'г. Новоозёрск, Кольцевая ул., 45'],
      ['Гайка в Промзоне', 'г. Новоозёрск, Промышленный пр., 8, стр. 2'],
    ],
  },
];

const authors = ['Анна К.', 'Игорь П.', 'Мария С.', 'Дмитрий Л.', 'Ольга В.', 'Сергей Н.', 'Елена Т.', 'Павел Р.'];
const texts = [
  'Очень плохо, больше не приду.',
  'Ожидал большего, есть проблемы с обслуживанием.',
  'Нормально, но есть что улучшить.',
  'Хорошо, рекомендую.',
  'Отлично, всё понравилось!',
];
const statuses: ReviewStatus[] = ['new', 'in_progress', 'done'];

export const toDay = (time: number) => new Date(time).toISOString().slice(0, 10);

// data ends today, like a freshly seeded database, so the default period always has numbers
export const today = Date.parse(`${toDay(Date.now())}T00:00:00Z`);

export const companies: Company[] = seed.map((company, index) => ({ id: index + 1, name: company.name }));

export const branches: Branch[] = seed
  .flatMap((company, index) => company.branches.map(([name, address]) => ({ companyId: index + 1, name, address })))
  .map((branch, index) => ({ id: index + 1, ...branch }));

export const users: SessionUser[] = [
  { id: 1, email: 'admin@demo.test', role: 'admin', companyId: null },
  ...seed.map((company, index): SessionUser => ({
    id: index + 2,
    email: company.user,
    role: 'client',
    companyId: index + 1,
  })),
];

export const metrics: (DayMetrics & { branchId: number })[] = branches.flatMap((branch) =>
  Array.from({ length: DAYS }, (_, day) => {
    const date = new Date(today - (DAYS - 1 - day) * DAY_MS);
    const base = 80 + branch.id * 35 + day * ((branch.id % 3) + 1) * 0.6;
    const wave = 1 + 0.25 * Math.sin(((date.getUTCDay() + branch.id) / 7) * 2 * Math.PI);
    const views = Math.round(base * wave);

    return {
      branchId: branch.id,
      date: toDay(date.getTime()),
      views,
      siteClicks: Math.round(views * (0.05 + branch.id * 0.01)),
      calls: Math.round(views * 0.03) + (day % 4),
      routes: Math.round(views * (0.08 + (branch.id % 2) * 0.04)),
    };
  }),
);

export const reviews: Review[] = branches
  .flatMap((branch) => {
    const count = 30 + ((branch.id * 7) % 11);

    return Array.from({ length: count }, (_, index) => {
      const key = index * 31 + branch.id * 17;
      // each branch leans to a different average rating
      const rating = Math.min(5, Math.max(1, (key % 5) + (branch.id % 3)));
      const publishedAt = today - Math.floor((index * DAYS) / count) * DAY_MS + ((key * 3_607_000) % DAY_MS);

      return {
        id: 0,
        branchId: branch.id,
        branchName: branch.name,
        authorName: authors[key % authors.length],
        rating,
        text: texts[rating - 1],
        status: statuses[(key >> 1) % 3],
        publishedAt: new Date(publishedAt).toISOString(),
      };
    });
  })
  .map((review, index) => ({ ...review, id: index + 1 }));
