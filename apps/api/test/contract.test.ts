import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, describe, test } from 'node:test';
import { Ajv2020, type ValidateFunction } from 'ajv/dist/2020.js';
import formats from 'ajv-formats';
import { parse } from 'yaml';
import { type ApiResponse, startApp, type TestContext } from './helpers.ts';

type Method = 'get' | 'post' | 'patch';
type Actor = 'admin' | 'north' | 'gaika' | null;

interface Ids {
  gaikaCompanyId: number;
  gaikaBranchId: number;
  gaikaReview: { id: number; status: string };
  northBranchId: number;
}

interface Case {
  name: string;
  method: Method;
  route: string;
  status: number;
  as: Actor;
  url?: (ids: Ids) => string;
  body?: (ids: Ids) => unknown;
  headers?: Record<string, string>;
}

const spec = parse(await readFile(new URL('../../../packages/contracts/openapi.yaml', import.meta.url), 'utf8'));

// strict key set: without editing the spec, any field the API returns beyond `properties` must fail the check
function forbidExtraProperties(node: unknown): void {
  if (typeof node !== 'object' || node === null) return;
  const schema = node as Record<string, unknown>;

  if (schema.type === 'object' && schema.properties && !('additionalProperties' in schema)) {
    schema.additionalProperties = false;
  }

  Object.values(schema).forEach(forbidExtraProperties);
}

const strictSpec = structuredClone(spec);

forbidExtraProperties(strictSpec.components.schemas);
const ajv = new Ajv2020({ strict: false, allErrors: true, validateSchema: false });

formats.default(ajv, ['date', 'date-time']);
ajv.addSchema(strictSpec, 'openapi');

const pointerPart = (key: string) => encodeURIComponent(key.replaceAll('~', '~0').replaceAll('/', '~1'));

function responseSpec(route: string, method: Method, status: number): { pointer: string; content?: unknown } {
  let pointer = `/paths/${pointerPart(route)}/${method}/responses/${status}`;
  let response = spec.paths[route]?.[method]?.responses?.[status];

  assert.ok(response, `${method.toUpperCase()} ${route} ${status} is not in openapi.yaml`);

  if (response.$ref) {
    pointer = response.$ref.slice(1);
    response = spec.components.responses[response.$ref.split('/').pop()];
  }

  return { pointer, content: response.content };
}

const validators = new Map<string, ValidateFunction>();

function validatorFor(pointer: string): ValidateFunction {
  const ref = `openapi#${pointer}/content/application~1json/schema`;

  if (!validators.has(ref)) validators.set(ref, ajv.compile({ $ref: ref }));

  return validators.get(ref)!;
}

function assertMatchesSpec(res: ApiResponse, { route, method, status }: Case): void {
  assert.equal(res.status, status, `unexpected status, body: ${JSON.stringify(res.body)}`);
  const { pointer, content } = responseSpec(route, method, status);

  if (!content) {
    assert.equal(res.body, null);

    return;
  }

  assert.match(res.headers.get('content-type') ?? '', /^application\/json(;|$)/);
  const validate = validatorFor(pointer);

  assert.ok(
    validate(res.body),
    `${ajv.errorsText(validate.errors, { dataVar: 'body' })} ${JSON.stringify(validate.errors)}`,
  );
}

let ctx: TestContext;
const cookies: Record<Exclude<Actor, null>, string> = { admin: '', north: '', gaika: '' };
let ids: Ids;

before(async () => {
  ctx = await startApp();
  for (const actor of ['admin', 'north', 'gaika'] as const) cookies[actor] = await ctx.login(`${actor}@demo.test`);
  const gaika = await ctx.request('/auth/me', { cookie: cookies.gaika });
  const gaikaBranches = await ctx.request('/branches', { cookie: cookies.gaika });
  const gaikaReviews = await ctx.request('/reviews?limit=1', { cookie: cookies.gaika });
  const northBranches = await ctx.request('/branches', { cookie: cookies.north });

  ids = {
    gaikaCompanyId: gaika.body.companyId,
    gaikaBranchId: gaikaBranches.body[0].id,
    gaikaReview: gaikaReviews.body.items[0],
    northBranchId: northBranches.body[0].id,
  };
});
after(() => ctx.app.close());

const login =
  (email: string, password = 'demo-password') =>
  () => ({ email, password });
const sameStatus = (ids: Ids) => ({ status: ids.gaikaReview.status });
const reviewUrl = (ids: Ids) => `/reviews/${ids.gaikaReview.id}`;
const crossSite = { 'sec-fetch-site': 'cross-site' };
const plainText = { 'content-type': 'text/plain' };
const MAX_ID = 2147483647;

const cases: Case[] = [
  { name: 'health', method: 'get', route: '/health', status: 200, as: null },

  {
    name: 'admin logs in',
    method: 'post',
    route: '/auth/login',
    status: 200,
    as: null,
    body: login('admin@demo.test'),
  },
  {
    name: 'client logs in',
    method: 'post',
    route: '/auth/login',
    status: 200,
    as: null,
    body: login('north@demo.test'),
  },
  {
    name: 'login without password',
    method: 'post',
    route: '/auth/login',
    status: 400,
    as: null,
    body: () => ({ email: 'north@demo.test' }),
  },
  {
    name: 'wrong password',
    method: 'post',
    route: '/auth/login',
    status: 401,
    as: null,
    body: login('north@demo.test', 'wrong-password'),
  },
  {
    name: 'cross-site login',
    method: 'post',
    route: '/auth/login',
    status: 403,
    as: null,
    body: login('north@demo.test'),
    headers: crossSite,
  },
  {
    name: 'non-JSON login',
    method: 'post',
    route: '/auth/login',
    status: 415,
    as: null,
    body: () => 'email=x',
    headers: plainText,
  },

  { name: 'logout without session', method: 'post', route: '/auth/logout', status: 401, as: null },
  { name: 'cross-site logout', method: 'post', route: '/auth/logout', status: 403, as: 'north', headers: crossSite },

  { name: 'admin me', method: 'get', route: '/auth/me', status: 200, as: 'admin' },
  { name: 'client me', method: 'get', route: '/auth/me', status: 200, as: 'north' },
  { name: 'me without session', method: 'get', route: '/auth/me', status: 401, as: null },

  { name: 'admin companies', method: 'get', route: '/companies', status: 200, as: 'admin' },
  { name: 'client companies', method: 'get', route: '/companies', status: 200, as: 'gaika' },
  { name: 'companies without session', method: 'get', route: '/companies', status: 401, as: null },

  { name: 'admin branches', method: 'get', route: '/branches', status: 200, as: 'admin' },
  {
    name: 'admin branches of a company',
    method: 'get',
    route: '/branches',
    status: 200,
    as: 'admin',
    url: (ids) => `/branches?companyId=${ids.gaikaCompanyId}`,
  },
  { name: 'client branches', method: 'get', route: '/branches', status: 200, as: 'north' },
  {
    name: 'branches with bad companyId',
    method: 'get',
    route: '/branches',
    status: 400,
    as: 'admin',
    url: () => '/branches?companyId=abc',
  },
  { name: 'branches without session', method: 'get', route: '/branches', status: 401, as: null },
  {
    name: 'branches of a foreign company',
    method: 'get',
    route: '/branches',
    status: 404,
    as: 'north',
    url: (ids) => `/branches?companyId=${ids.gaikaCompanyId}`,
  },
  {
    name: 'branches of a missing company',
    method: 'get',
    route: '/branches',
    status: 404,
    as: 'admin',
    url: () => `/branches?companyId=${MAX_ID}`,
  },

  { name: 'admin analytics', method: 'get', route: '/analytics', status: 200, as: 'admin' },
  {
    name: 'client analytics for a branch and period',
    method: 'get',
    route: '/analytics',
    status: 200,
    as: 'north',
    url: (ids) => `/analytics?branchId=${ids.northBranchId}&from=2000-01-01&to=2000-01-31`,
  },
  { name: 'client analytics', method: 'get', route: '/analytics', status: 200, as: 'north' },
  {
    name: 'analytics with bad date',
    method: 'get',
    route: '/analytics',
    status: 400,
    as: 'north',
    url: () => '/analytics?from=2025-13-01',
  },
  { name: 'analytics without session', method: 'get', route: '/analytics', status: 401, as: null },
  {
    name: 'analytics of a foreign branch',
    method: 'get',
    route: '/analytics',
    status: 404,
    as: 'north',
    url: (ids) => `/analytics?branchId=${ids.gaikaBranchId}`,
  },

  { name: 'admin reviews', method: 'get', route: '/reviews', status: 200, as: 'admin' },
  {
    name: 'client reviews with filters',
    method: 'get',
    route: '/reviews',
    status: 200,
    as: 'gaika',
    url: () => '/reviews?status=new&rating=5&limit=100&offset=0',
  },
  {
    name: 'reviews with bad limit',
    method: 'get',
    route: '/reviews',
    status: 400,
    as: 'admin',
    url: () => '/reviews?limit=0',
  },
  { name: 'reviews without session', method: 'get', route: '/reviews', status: 401, as: null },
  {
    name: 'reviews of a foreign company',
    method: 'get',
    route: '/reviews',
    status: 404,
    as: 'north',
    url: (ids) => `/reviews?companyId=${ids.gaikaCompanyId}`,
  },

  // the review keeps its status, so parallel test files see unchanged data
  {
    name: 'admin sets review status',
    method: 'patch',
    route: '/reviews/{id}',
    status: 200,
    as: 'admin',
    url: reviewUrl,
    body: sameStatus,
  },
  {
    name: 'client sets review status',
    method: 'patch',
    route: '/reviews/{id}',
    status: 200,
    as: 'gaika',
    url: reviewUrl,
    body: sameStatus,
  },
  {
    name: 'unknown review status',
    method: 'patch',
    route: '/reviews/{id}',
    status: 400,
    as: 'gaika',
    url: reviewUrl,
    body: () => ({ status: 'bogus' }),
  },
  {
    name: 'bad review id',
    method: 'patch',
    route: '/reviews/{id}',
    status: 400,
    as: 'admin',
    url: () => '/reviews/abc',
    body: sameStatus,
  },
  {
    name: 'review status without session',
    method: 'patch',
    route: '/reviews/{id}',
    status: 401,
    as: null,
    url: reviewUrl,
    body: sameStatus,
  },
  {
    name: 'cross-site review status',
    method: 'patch',
    route: '/reviews/{id}',
    status: 403,
    as: 'gaika',
    url: reviewUrl,
    body: sameStatus,
    headers: crossSite,
  },
  {
    name: 'foreign review',
    method: 'patch',
    route: '/reviews/{id}',
    status: 404,
    as: 'north',
    url: reviewUrl,
    body: sameStatus,
  },
  {
    name: 'missing review',
    method: 'patch',
    route: '/reviews/{id}',
    status: 404,
    as: 'admin',
    url: () => `/reviews/${MAX_ID}`,
    body: sameStatus,
  },
  {
    name: 'non-JSON review status',
    method: 'patch',
    route: '/reviews/{id}',
    status: 415,
    as: 'gaika',
    url: reviewUrl,
    body: () => 'status=new',
    headers: plainText,
  },
];

describe('responses match openapi.yaml', () => {
  for (const contractCase of cases) {
    const { name, method, route, status, as, url, body, headers } = contractCase;

    test(`${method.toUpperCase()} ${route} ${status}: ${name}`, async () => {
      const res = await ctx.request(url?.(ids) ?? route, {
        method: method.toUpperCase(),
        cookie: as ? cookies[as] : undefined,
        body: body?.(ids),
        headers,
      });

      assertMatchesSpec(res, contractCase);
      if (route === '/auth/login' && status === 200) assert.match(res.headers.get('set-cookie') ?? '', /^sid=/);
    });
  }

  test('POST /auth/logout 204', async () => {
    const cookie = await ctx.login('north@demo.test');
    const res = await ctx.request('/auth/logout', { method: 'POST', cookie });

    assertMatchesSpec(res, { name: 'logout', method: 'post', route: '/auth/logout', status: 204, as: 'north' });
  });

  // drains this process's login token bucket, so it must stay the last test of the file
  test('POST /auth/login 429', async () => {
    let res: ApiResponse;
    let attempts = 0;

    do {
      res = await ctx.request('/auth/login', {
        method: 'POST',
        body: { email: 'nobody@demo.test', password: 'wrong' },
      });
      attempts += 1;
    } while (res.status === 401 && attempts <= 20);

    assertMatchesSpec(res, { name: 'rate limit', method: 'post', route: '/auth/login', status: 429, as: null });
    assert.ok(Number(res.headers.get('retry-after')) >= 1, 'Retry-After is a positive integer');
  });
});
