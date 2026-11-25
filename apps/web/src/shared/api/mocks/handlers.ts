import type { ApiError, Branch, paths, Period, Review, ReviewStatus, SessionUser } from 'contracts';
import { HttpResponse } from 'msw';
import { createOpenApiHttp } from 'openapi-msw';
import { branches, companies, DAY_MS, DEMO_PASSWORD, metrics, reviews, toDay, users } from './data';

const http = createOpenApiHttp<paths>({ baseUrl: '/api' });

// sessionStorage plays the server's database: login and status changes survive a reload but not a new tab
const SESSION_KEY = 'api-mocks:session';
const STATUSES_KEY = 'api-mocks:review-statuses';

const MAX_INT = 2_147_483_647;
const MAX_PERIOD_DAYS = 366;
const DEFAULT_PERIOD_DAYS = 30;
const MIN_DAY = '2000-01-01';
const MAX_DAY = '2100-12-31';
const REVIEW_STATUSES: readonly string[] = ['new', 'in_progress', 'done'] satisfies ReviewStatus[];
const ERROR_NAMES: Record<number, string> = { 400: 'Bad Request', 401: 'Unauthorized', 404: 'Not Found' };
const PARAM_LABEL: Record<string, string> = {
  from: 'с',
  to: 'по',
  rating: 'оценка',
  limit: 'лимит',
  offset: 'смещение',
};

interface Scope {
  companyId: number | null;
  branchId: number | null;
}

// MSW turns a thrown Response into the reply, which keeps the API's error flow as plain early exits
function fail(status: number, message: string): never {
  const body: ApiError = { statusCode: status, message, error: ERROR_NAMES[status] };

  throw HttpResponse.json(body, { status });
}

function currentUser(): SessionUser {
  const id = Number(sessionStorage.getItem(SESSION_KEY));

  return users.find((user) => user.id === id) ?? fail(401, 'Unauthorized');
}

function single(query: URLSearchParams, name: string): string | undefined {
  const values = query.getAll(name);

  if (values.length > 1) fail(400, `Параметр «${PARAM_LABEL[name] ?? name}» должен быть указан один раз`);

  return values[0] || undefined;
}

function parseId(text: string | undefined, message: string): number | undefined {
  if (text === undefined) return undefined;
  if (!/^[1-9]\d*$/.test(text) || Number(text) > MAX_INT) fail(400, message);

  return Number(text);
}

function parseIntRange(query: URLSearchParams, name: string, min: number, max: number): number | undefined {
  const text = single(query, name);

  if (text === undefined) return undefined;
  const value = Number(text);

  if (!/^\d+$/.test(text) || value < min || value > max) {
    fail(400, `Неверное значение «${PARAM_LABEL[name]}»: нужно целое число от ${min} до ${max}`);
  }

  return value;
}

function parseStatus(value: unknown): ReviewStatus | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !REVIEW_STATUSES.includes(value)) fail(400, 'Неверный статус');

  return value as ReviewStatus;
}

const ruDay = (day: string) => day.split('-').reverse().join('.');

function parseDay(value: string, name: string): number {
  const time = Date.parse(`${value}T00:00:00Z`);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(time) || toDay(time) !== value) {
    fail(400, `Дата «${PARAM_LABEL[name]}» должна быть в формате ГГГГ-ММ-ДД`);
  }

  if (value < MIN_DAY || value > MAX_DAY) {
    fail(400, `Дата «${PARAM_LABEL[name]}» должна быть между ${ruDay(MIN_DAY)} и ${ruDay(MAX_DAY)}`);
  }

  return time;
}

function createPeriod(from: string | undefined, to: string): Period {
  const toTime = parseDay(to, 'to');
  const fromTime = from === undefined ? toTime - (DEFAULT_PERIOD_DAYS - 1) * DAY_MS : parseDay(from, 'from');

  if (fromTime > toTime) fail(400, 'Дата «с» позже даты «по»');
  if ((toTime - fromTime) / DAY_MS + 1 > MAX_PERIOD_DAYS)
    fail(400, `Период не может быть длиннее ${MAX_PERIOD_DAYS} дней`);

  return { from: toDay(fromTime), to: toDay(toTime) };
}

// 404 for both foreign and missing ids, as in the API, so the UI shows the same «не найдена»
function resolveScope(user: SessionUser, query: URLSearchParams): Scope {
  const requestedCompany = parseId(single(query, 'companyId'), 'Неверная компания');
  const branchId = parseId(single(query, 'branchId'), 'Неверный филиал') ?? null;

  if (user.role === 'client' && requestedCompany !== undefined && requestedCompany !== user.companyId) {
    fail(404, 'Компания не найдена');
  }

  const companyId = user.role === 'client' ? user.companyId : (requestedCompany ?? null);

  if (companyId !== null && !companies.some((company) => company.id === companyId)) fail(404, 'Компания не найдена');

  if (branchId !== null && !scopedBranches({ companyId, branchId: null }).some((branch) => branch.id === branchId)) {
    fail(404, 'Филиал не найден');
  }

  return { companyId, branchId };
}

const scopedBranches = (scope: Scope): Branch[] =>
  branches.filter(
    (branch) =>
      (scope.companyId === null || branch.companyId === scope.companyId) &&
      (scope.branchId === null || branch.id === scope.branchId),
  );

const inPeriod = (review: Review, period: Period) =>
  review.publishedAt >= `${period.from}T00:00:00` && review.publishedAt.slice(0, 10) <= period.to;

function currentReviews(): Review[] {
  const changed = JSON.parse(sessionStorage.getItem(STATUSES_KEY) ?? '{}') as Record<string, ReviewStatus>;

  return reviews.map((review) => ({ ...review, status: changed[review.id] ?? review.status }));
}

function reviewsIn(scope: Scope): Review[] {
  const ids = new Set(scopedBranches(scope).map((branch) => branch.id));

  return currentReviews().filter((review) => ids.has(review.branchId));
}

function analytics(scope: Scope, from: string | undefined, to: string | undefined) {
  const ids = new Set(scopedBranches(scope).map((branch) => branch.id));
  const rows = metrics.filter((row) => ids.has(row.branchId));
  const latestDay = rows.reduce<string | undefined>(
    (max, row) => (max === undefined || row.date > max ? row.date : max),
    undefined,
  );
  const period = createPeriod(from, to ?? latestDay ?? toDay(Date.now()));

  const timeseries = [];

  for (let time = Date.parse(period.from); time <= Date.parse(period.to); time += DAY_MS) {
    const date = toDay(time);
    const day = { date, views: 0, siteClicks: 0, calls: 0, routes: 0 };

    for (const row of rows.filter((metric) => metric.date === date)) {
      day.views += row.views;
      day.siteClicks += row.siteClicks;
      day.calls += row.calls;
      day.routes += row.routes;
    }

    timeseries.push(day);
  }

  const ratings = reviewsIn(scope)
    .filter((review) => inPeriod(review, period))
    .map((review) => review.rating);
  const summary = {
    views: timeseries.reduce((sum, day) => sum + day.views, 0),
    siteClicks: timeseries.reduce((sum, day) => sum + day.siteClicks, 0),
    calls: timeseries.reduce((sum, day) => sum + day.calls, 0),
    routes: timeseries.reduce((sum, day) => sum + day.routes, 0),
    avgRating: ratings.length
      ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10
      : null,
    reviewsCount: ratings.length,
  };

  return { period, summary, timeseries };
}

const searchOf = (request: Request) => new URL(request.url).searchParams;

export const handlers = [
  http.get('/health', ({ response }) => response(200).json({ status: 'ok', database: 'ok' })),

  http.post('/auth/login', async ({ request, response }) => {
    const body = (await request.json().catch(() => null)) as Partial<Record<'email' | 'password', unknown>> | null;
    const { email, password } = body ?? {};

    if (typeof email !== 'string' || typeof password !== 'string') return fail(400, 'Укажите email и пароль');
    const user = users.find((candidate) => candidate.email === email.trim().toLowerCase());

    if (!user || password !== DEMO_PASSWORD) return fail(401, 'Неверный email или пароль');
    sessionStorage.setItem(SESSION_KEY, String(user.id));

    return response(200).json(user);
  }),

  http.post('/auth/logout', ({ response }) => {
    currentUser();
    sessionStorage.removeItem(SESSION_KEY);

    return response(204).empty();
  }),

  http.get('/auth/me', ({ response }) => response(200).json(currentUser())),

  http.get('/companies', ({ response }) => {
    const user = currentUser();

    return response(200).json(companies.filter((company) => user.companyId === null || company.id === user.companyId));
  }),

  http.get('/branches', ({ request, response }) => {
    const user = currentUser();
    const query = searchOf(request);

    query.delete('branchId');

    return response(200).json(scopedBranches(resolveScope(user, query)));
  }),

  http.get('/analytics', ({ request, response }) => {
    const user = currentUser();
    const query = searchOf(request);
    const scope = resolveScope(user, query);

    return response(200).json(analytics(scope, single(query, 'from'), single(query, 'to')));
  }),

  http.get('/reviews', ({ request, response }) => {
    const user = currentUser();
    const query = searchOf(request);
    const scope = resolveScope(user, query);
    const rating = parseIntRange(query, 'rating', 1, 5);
    const status = parseStatus(single(query, 'status'));
    const from = single(query, 'from');
    const to = single(query, 'to');
    const period = from === undefined && to === undefined ? null : createPeriod(from, to ?? toDay(Date.now()));
    const limit = parseIntRange(query, 'limit', 1, 100) ?? 20;
    const offset = parseIntRange(query, 'offset', 0, MAX_INT) ?? 0;

    const found = reviewsIn(scope)
      .filter((review) => rating === undefined || review.rating === rating)
      .filter((review) => status === undefined || review.status === status)
      .filter((review) => period === null || inPeriod(review, period))
      .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt) || right.id - left.id);

    return response(200).json({ items: found.slice(offset, offset + limit), total: found.length });
  }),

  http.patch('/reviews/{id}', async ({ params, request, response }) => {
    const user = currentUser();
    const id = parseId(String(params.id), 'Неверное значение «id»');
    const body = (await request.json().catch(() => null)) as { status?: unknown } | null;
    const status = parseStatus(body?.status) ?? fail(400, 'Неверный статус');
    const review = reviewsIn({ companyId: user.companyId, branchId: null }).find((candidate) => candidate.id === id);

    if (!review) return fail(404, 'Отзыв не найден');

    const changed = JSON.parse(sessionStorage.getItem(STATUSES_KEY) ?? '{}') as Record<string, ReviewStatus>;

    sessionStorage.setItem(STATUSES_KEY, JSON.stringify({ ...changed, [review.id]: status }));

    return response(200).json({ ...review, status });
  }),
];
