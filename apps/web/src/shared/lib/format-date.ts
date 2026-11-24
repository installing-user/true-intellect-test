const DAY_MS = 86_400_000;

// Day boundaries everywhere (filters, chart, API) are UTC, so dates are shown in UTC too.
export function formatDate(value: string): string {
  return new Date(value)
    .toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .replace(/ г\.$/, '');
}

export function shiftDate(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}
