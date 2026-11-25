export const DAY_MS = 86_400_000;

export const toIso = (time: number) => new Date(time).toISOString().slice(0, 10);
export const parse = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
export const addDays = (iso: string, days: number) => toIso(parse(iso) + days * DAY_MS);
export const weekday = (iso: string) => (new Date(parse(iso)).getUTCDay() + 6) % 7;

export function clamp(iso: string, min: string, max: string) {
  if (iso < min) return min;

  return iso > max ? max : iso;
}

export const capitalize = (text: string) => text[0].toUpperCase() + text.slice(1);

export function addMonths(iso: string, months: number) {
  const [y, month, day] = iso.split('-').map(Number);
  const last = new Date(Date.UTC(y, month + months, 0)).getUTCDate();

  return toIso(Date.UTC(y, month - 1 + months, Math.min(day, last)));
}

export const monthNames = Array.from({ length: 12 }, (_, index) =>
  capitalize(new Intl.DateTimeFormat('ru', { month: 'long', timeZone: 'UTC' }).format(Date.UTC(2000, index, 1))),
);
export const weekdayNames = Array.from({ length: 7 }, (_, index) =>
  capitalize(new Intl.DateTimeFormat('ru', { weekday: 'short', timeZone: 'UTC' }).format(Date.UTC(2024, 0, 1 + index))),
);
export const dayLabel = new Intl.DateTimeFormat('ru', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export const mask = (digits: string) =>
  [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join('.');
export const toDigits = (iso: string) => iso.slice(8, 10) + iso.slice(5, 7) + iso.slice(0, 4);

export function fromDigits(digits: string) {
  if (digits.length !== 8) return null;
  const iso = `${digits.slice(4)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
  const time = parse(iso);

  return Number.isNaN(time) || toIso(time) !== iso ? null : iso;
}
