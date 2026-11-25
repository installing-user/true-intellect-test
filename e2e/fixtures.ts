import { readFileSync } from 'node:fs';
import { test as base, type Cookie } from '@playwright/test';
import { stateFile } from './api';
import type { UserKey } from './users';

export { expect, type Page } from '@playwright/test';

export const test = base.extend<{ user: UserKey | undefined }>({
  user: [undefined, { option: true }],

  browser: [
    async ({ playwright }, use) => {
      const endpoint = process.env.OBSCURA_CDP_URL;
      const browser = endpoint
        ? await playwright.chromium.connectOverCDP(endpoint, {
            headers: { authorization: `Bearer ${process.env.OBSCURA_CDP_TOKEN}` },
          })
        : await playwright.chromium.launch();

      await use(browser);
      await browser.close();
    },
    { scope: 'worker' },
  ],

  // Obscura can't restore storageState, so the session cookie from auth.setup is added by hand in both browsers
  context: async ({ browser, baseURL, viewport, isMobile, hasTouch, locale, user }, use) => {
    const context = await browser.newContext({ baseURL, viewport, isMobile, hasTouch, locale });

    if (user) {
      const { cookies } = JSON.parse(readFileSync(stateFile(user), 'utf8')) as { cookies: Cookie[] };

      await context.addCookies(cookies);
    }

    await use(context);
    await context.close();
  },
});
