export type PluralForms = [string, string, string];

const formIndex: Partial<Record<Intl.LDMLPluralRule, number>> = { one: 0, few: 1 };

export function pluralForm(count: number, forms: PluralForms): string {
  const category = new Intl.PluralRules('ru').select(count);

  return forms[formIndex[category] ?? 2];
}

export function plural(count: number, forms: PluralForms): string {
  return `${count.toLocaleString('ru-RU')} ${pluralForm(count, forms)}`;
}
