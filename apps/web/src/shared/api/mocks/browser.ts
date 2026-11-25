import { getResponse } from 'msw';
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

export function startMocks(): Promise<unknown> {
  if ('ServiceWorkerRegistration' in window) return worker.start({ onUnhandledFrame: 'bypass', quiet: true });

  // Obscura has navigator.serviceWorker without a working register(), and msw's own fetch-patching fallback hangs there
  Headers.prototype.getSetCookie ??= function (this: Headers) {
    return this.get('set-cookie')?.split(', ') ?? [];
  };

  const realFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async (input, init) => {
    // Obscura keeps a relative Request.url, which msw cannot parse
    const request = input instanceof Request ? input : new Request(new URL(input, location.href), init);

    return (await getResponse(handlers, request)) ?? realFetch(input, init);
  };

  return Promise.resolve();
}
