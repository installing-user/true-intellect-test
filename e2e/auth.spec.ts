import { expect, test } from './fixtures';
import { PASSWORD, users } from './users';

test.describe('вход', () => {
  test('неверный пароль показывает ошибку, верный открывает дашборд', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(users.north);
    await page.getByLabel('Пароль').fill('wrong-password');
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Неверный' })).toHaveText('Неверный email или пароль');
    await expect(page).toHaveURL(/\/login$/);

    // a successful login resets the API's failed-attempt counter, so reruns never hit the 429 lockout
    await page.getByLabel('Пароль').fill(PASSWORD);
    await page.getByRole('button', { name: 'Войти' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: 'Дашборд', level: 1 })).toBeVisible();
    await expect(page.getByText(`${users.north} · клиент`)).toBeVisible();
  });

  for (const path of ['/dashboard', '/reviews', '/']) {
    test(`без сессии ${path} уводит на /login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole('heading', { name: 'Вход в кабинет' })).toBeVisible();
    });
  }

  test('выход завершает сессию', async ({ page }) => {
    // own session: logging out a shared storageState would break parallel tests
    const res = await page.request.post('/api/auth/login', { data: { email: users.gaika, password: PASSWORD } });

    expect(res.status()).toBe(200);
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Выйти' }).click();
    await expect(page).toHaveURL(/\/login$/);

    expect((await page.request.get('/api/auth/me')).status()).toBe(401);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
  });
});
