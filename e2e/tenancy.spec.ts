import { expect, test } from './fixtures';
import type { Branch, Company } from 'contracts';
import { apiAs, companyOf, getJson } from './api';

test.describe('клиент видит только свою компанию', () => {
  test.use({ user: 'north' });

  test('в списке и в фильтре только свои филиалы', async ({ page, baseURL }) => {
    const own = await companyOf('north', baseURL);
    const foreign = await companyOf('gaika', baseURL);

    await page.goto('/dashboard');
    const list = page.getByRole('region', { name: 'Филиалы' });

    for (const branch of own.branches) await expect(list.getByRole('button', { name: branch.name })).toBeVisible();
    await expect(list.getByRole('button')).toHaveCount(own.branches.length);
    for (const branch of foreign.branches) await expect(page.getByText(branch.name)).toHaveCount(0);

    await expect(page.getByRole('button', { name: /^Компания/ })).toHaveCount(0);
    await page.getByRole('combobox', { name: 'Филиал', exact: true }).click();
    await expect(page.getByRole('listbox', { name: 'Филиал' }).getByRole('option')).toHaveCount(
      own.branches.length + 1,
    );
  });

  test('чужая компания в URL дашборда даёт «не найдена», а не чужие цифры', async ({ page, baseURL }) => {
    const foreign = await companyOf('gaika', baseURL);

    await page.goto(`/dashboard?companyId=${foreign.companyId}`);
    const summary = page.getByRole('region', { name: 'Показатели' });

    await expect(summary.getByRole('alert')).toContainText('Компания не найдена');
    await expect(summary.getByRole('listitem')).toHaveCount(0);
  });

  test('чужой филиал в URL дашборда даёт «не найден»', async ({ page, baseURL }) => {
    const foreign = await companyOf('gaika', baseURL);

    await page.goto(`/dashboard?branchId=${foreign.branches[0].id}`);
    const summary = page.getByRole('region', { name: 'Показатели' });

    await expect(summary.getByRole('alert')).toContainText('Филиал не найден');
    await expect(summary.getByRole('listitem')).toHaveCount(0);
  });

  test('чужой филиал в URL отзывов даёт «не найден», а не чужие отзывы', async ({ page, baseURL }) => {
    const foreign = await companyOf('gaika', baseURL);

    await page.goto(`/reviews?branchId=${foreign.branches[0].id}`);
    const results = page.getByRole('region', { name: 'Список отзывов' });

    await expect(results.getByRole('alert')).toContainText('Филиал не найден');
    await expect(results.getByText(foreign.branches[0].name)).toHaveCount(0);
  });

  test('API не отдаёт чужие данные', async ({ baseURL }) => {
    const foreign = await companyOf('gaika', baseURL);
    const api = await apiAs('north', baseURL);

    expect((await api.get(`/api/analytics?companyId=${foreign.companyId}`)).status()).toBe(404);
    expect((await api.get(`/api/reviews?branchId=${foreign.branches[0].id}`)).status()).toBe(404);
    await api.dispose();
  });
});

test.describe('администратор', () => {
  test.use({ user: 'admin' });

  test('видит обе компании и переключает их селектором', async ({ page, baseURL }) => {
    const api = await apiAs('admin', baseURL);
    const companies = await getJson<Company[]>(api, '/api/companies');
    const branches = await getJson<Branch[]>(api, '/api/branches');

    await api.dispose();
    expect(companies.length).toBeGreaterThanOrEqual(2);

    await page.goto('/dashboard');
    await expect(page.getByText('admin@demo.test · администратор')).toBeVisible();
    const list = page.getByRole('region', { name: 'Филиалы' });

    for (const company of companies) await expect(list.getByRole('heading', { name: company.name })).toBeVisible();
    await expect(list.getByRole('button')).toHaveCount(branches.length);

    const target = companies[1];
    const picker = page.getByRole('button', { name: /^Компания/ });

    await expect(picker).toHaveAccessibleName(/Все компании/);
    await picker.click();
    await page.getByRole('group', { name: 'Компании' }).getByRole('button', { name: target.name }).click();

    await expect(page).toHaveURL(new RegExp(`companyId=${target.id}`));
    await expect(picker).toHaveAccessibleName(new RegExp(target.name));
    await expect(list.getByRole('button')).toHaveCount(
      branches.filter((branch) => branch.companyId === target.id).length,
    );
    await expect(page.getByRole('region', { name: 'Показатели' }).getByRole('listitem')).toHaveCount(6);
  });
});
