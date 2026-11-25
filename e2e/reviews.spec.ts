import { expect, type Page, test } from './fixtures';
import { chooseOption } from './dashboard';

const cards = (page: Page) => page.getByRole('region', { name: 'Список отзывов' }).getByRole('listitem');

test.describe('фильтры отзывов', () => {
  test.use({ user: 'north' });

  test('по оценке', async ({ page }) => {
    await page.goto('/reviews');
    await chooseOption(page, 'Оценка', '2 звезды');
    await expect(page).toHaveURL(/rating=2/);
    await expect(cards(page).first()).toBeVisible();

    for (const stars of await cards(page)
      .getByRole('img', { name: /^Оценка/ })
      .all()) {
      await expect(stars).toHaveAccessibleName('Оценка 2 из 5');
    }
  });

  test('по статусу', async ({ page }) => {
    await page.goto('/reviews');
    await chooseOption(page, 'Статус', 'В работе');
    await expect(page).toHaveURL(/status=in_progress/);
    await expect(cards(page).first()).toBeVisible();

    for (const status of await cards(page).getByRole('combobox', { name: 'Статус отзыва' }).all()) {
      await expect(status).toHaveText('В работе');
    }
  });
});

test.describe('смена статуса отзыва', () => {
  // gaika is not used by the filter tests, so this mutation can't race them
  test.use({ user: 'gaika' });

  test('сохраняется после перезагрузки', async ({ page }) => {
    await page.goto('/reviews');
    const card = cards(page).first();
    const status = card.getByRole('combobox', { name: 'Статус отзыва' });
    const original = (await status.innerText()).trim();
    const next = original === 'Обработан' ? 'Новый' : 'Обработан';

    const setStatus = async (label: string) => {
      await status.click();
      await card.getByRole('listbox', { name: 'Статус отзыва' }).getByRole('option', { name: label }).click();
      await expect(card.getByRole('status')).toHaveText('Сохранено');
    };

    try {
      await setStatus(next);
      await page.reload();
      await expect(status).toHaveText(next);
    } finally {
      await setStatus(original);
    }

    await page.reload();
    await expect(status).toHaveText(original);
  });
});
