import { expect, test } from './fixtures';
import { chooseOption, metricValue } from './dashboard';
import { companyOf } from './api';

const VIEWS = 'Просмотры карточек';

test.describe('фильтры дашборда', () => {
  test.use({ user: 'north' });

  test('выбор филиала меняет URL и показатели', async ({ page, baseURL }) => {
    const { branches } = await companyOf('north', baseURL);

    await page.goto('/dashboard');
    const total = await metricValue(page, VIEWS);

    await chooseOption(page, 'Филиал', branches[0].name);
    await expect(page).toHaveURL(new RegExp(`branchId=${branches[0].id}`));
    await expect(
      page.getByRole('region', { name: 'Филиалы' }).getByRole('button', { name: branches[0].name }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => metricValue(page, VIEWS)).toBeLessThan(total);

    await chooseOption(page, 'Филиал', 'Все филиалы');
    await expect(page).not.toHaveURL(/branchId=/);
    await expect.poll(() => metricValue(page, VIEWS)).toBe(total);
  });

  test('пресеты периода меняют URL и показатели', async ({ page }) => {
    await page.goto('/dashboard');
    const presets = page.getByRole('group', { name: 'Готовый период' });

    await presets.getByRole('button', { name: '90 дней' }).click();
    await expect(page).toHaveURL(/from=\d{4}-\d{2}-\d{2}.*to=\d{4}-\d{2}-\d{2}/);
    await expect(presets.getByRole('button', { name: '90 дней' })).toHaveAttribute('aria-pressed', 'true');
    const days90 = await metricValue(page, VIEWS);

    await presets.getByRole('button', { name: '7 дней' }).click();
    await expect(presets.getByRole('button', { name: '7 дней' })).toHaveAttribute('aria-pressed', 'true');
    await expect(presets.getByRole('button', { name: '90 дней' })).toHaveAttribute('aria-pressed', 'false');
    const url = new URL(page.url());
    const from = Date.parse(url.searchParams.get('from')!);
    const to = Date.parse(url.searchParams.get('to')!);

    expect((to - from) / 86_400_000).toBe(6);
    await expect.poll(() => metricValue(page, VIEWS)).toBeLessThan(days90);
  });
});
