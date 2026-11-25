import { expect, type Page } from '@playwright/test';

export async function metricValue(page: Page, title: string): Promise<number> {
  const card = page.getByRole('region', { name: 'Показатели' }).getByRole('listitem').filter({ hasText: title });

  await expect(card).toHaveText(/\d/);
  const text = await card.innerText();

  return Number(text.replace(title, '').replace(/\D/g, ''));
}

// keyboard instead of clicking the option: Obscura's hit-testing lets a closed date-picker popup intercept the click
export async function chooseOption(page: Page, combobox: string, option: string | RegExp) {
  const trigger = page.getByRole('combobox', { name: combobox, exact: true });

  await trigger.press('Home');
  const targetId = await page
    .getByRole('listbox', { name: combobox, exact: true })
    .getByRole('option', { name: option, exact: true })
    .getAttribute('id');

  for (let step = 0; (await trigger.getAttribute('aria-activedescendant')) !== targetId; step++) {
    if (step > 100) throw new Error(`option ${String(option)} not reachable in ${combobox}`);
    await trigger.press('ArrowDown');
  }

  await trigger.press('Enter');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
}
