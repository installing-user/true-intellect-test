export type PluralForms = [string, string, string];

export function pluralForm(n: number, forms: PluralForms): string {
  const category = new Intl.PluralRules('ru').select(n);
  return forms[category === 'one' ? 0 : category === 'few' ? 1 : 2];
}

export function plural(n: number, forms: PluralForms): string {
  return `${n.toLocaleString('ru-RU')} ${pluralForm(n, forms)}`;
}
