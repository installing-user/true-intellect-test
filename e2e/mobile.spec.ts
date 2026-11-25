import { expect, type Page, test } from './fixtures';

test.use({ user: 'admin' });

const pages: [string, (page: Page) => Promise<void>][] = [
  [
    '/dashboard',
    (page) => expect(page.getByRole('region', { name: 'Показатели' }).getByRole('listitem')).toHaveCount(6),
  ],
  [
    '/reviews',
    (page) => expect(page.getByRole('region', { name: 'Список отзывов' }).getByRole('listitem').first()).toBeVisible(),
  ],
];

for (const [path, ready] of pages) {
  test(`375: ${path} без горизонтальной прокрутки`, async ({ page }) => {
    await page.goto(path);
    await ready(page);
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
}
