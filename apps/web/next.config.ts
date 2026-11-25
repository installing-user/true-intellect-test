import path from 'node:path';
import type { NextConfig } from 'next';

const apiOrigin = process.env.API_ORIGIN ?? 'http://127.0.0.1:3101';
const isProd = process.env.NODE_ENV === 'production';
// with mocks on, a request that slips past MSW must fail loudly instead of reaching a real API
const apiMocks = process.env.NEXT_PUBLIC_API_MOCKS === '1';

// Next inlines bootstrap scripts and styles, so 'unsafe-inline' stays until nonces are wired in.
// Dev mode needs eval and websockets for HMR, hence the policy is production only.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  ...(isProd ? [{ key: 'Content-Security-Policy', value: csp }] : []),
];

const config: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  // a mocks build must never overwrite the real one
  distDir: apiMocks ? '.next/mocks' : '.next',
  outputFileTracingRoot: path.resolve(__dirname, '../..'),
  turbopack: {
    root: path.resolve(__dirname, '../..'),
    // msw stays out of every build without the flag, and out of the server bundle with it: msw/browser has no server build
    resolveAlias: {
      '@/shared/api/mocks/browser': apiMocks
        ? { browser: './src/shared/api/mocks/browser.ts', default: './src/shared/api/mocks/off.ts' }
        : './src/shared/api/mocks/off.ts',
    },
  },
  async rewrites() {
    return apiMocks ? [] : [{ source: '/api/:path*', destination: `${apiOrigin}/:path*` }];
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default config;
