import { NestExpressApplication } from '@nestjs/platform-express';

interface HeaderResponse {
  setHeader(name: string, value: string): void;
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
};

// shared by main.ts and the tests so both run with the same HTTP settings
export function configureApp(app: NestExpressApplication): void {
  app.disable('x-powered-by');
  // the Next.js proxy is the only client on a private network; its X-Forwarded-For carries the real IP for the login limiter
  app.set('trust proxy', 'loopback, uniquelocal');
  app.use((_req: unknown, res: HeaderResponse, next: () => void) => {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(name, value);
    next();
  });
}
