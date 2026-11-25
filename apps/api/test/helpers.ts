import 'reflect-metadata';
import type { AddressInfo } from 'node:net';
import type { INestApplication, Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

export const DEMO_PASSWORD = 'demo-password';

// npm test compiles into dist-test so it does not wipe dist used by a running dev:api; Docker runs against dist
const distDir = new URL(`../${process.env.API_DIST ?? 'dist'}/`, import.meta.url);
const { AppModule } = (await import(new URL('app.module.js', distDir).href)) as { AppModule: Type<unknown> };
const { configureApp } = (await import(new URL('app.setup.js', distDir).href)) as {
  configureApp: (app: INestApplication) => void;
};

interface RequestOptions {
  cookie?: string;
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface ApiResponse {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tests assert on arbitrary JSON shapes
  body: any;
  headers: Headers;
}

export async function startApp() {
  const app = await NestFactory.create(AppModule, { logger: false });

  configureApp(app);
  await app.listen(0, '127.0.0.1');
  const { port } = app.getHttpServer().address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;

  async function request(
    path: string,
    { cookie, method = 'GET', body, headers = {} }: RequestOptions = {},
  ): Promise<ApiResponse> {
    const json = body !== undefined && typeof body !== 'string';
    const res = await fetch(baseUrl + path, {
      method,
      headers: {
        ...(cookie ? { cookie } : {}),
        ...(json ? { 'content-type': 'application/json' } : {}),
        ...headers,
      },
      body: json ? JSON.stringify(body) : (body as string | undefined),
    });
    const text = await res.text();

    return { status: res.status, body: text ? JSON.parse(text) : null, headers: res.headers };
  }

  async function login(email: string, password = DEMO_PASSWORD): Promise<string> {
    const res = await request('/auth/login', { method: 'POST', body: { email, password } });

    if (res.status !== 200) throw new Error(`login ${email} failed: ${res.status}`);

    return res.headers.get('set-cookie')!.split(';')[0];
  }

  return { app, request, login };
}

export type TestContext = Awaited<ReturnType<typeof startApp>>;
