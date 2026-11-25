import { formatDate } from '@/shared/lib';

export const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

export const parse = (date: string) => new Date(`${date}T00:00:00Z`);
export const short = (date: string) => `${parse(date).getUTCDate()} ${MONTHS[parse(date).getUTCMonth()]}`;
export const long = formatDate;
export const format = (value: number) => value.toLocaleString('ru-RU');

export function niceTicks(min: number, max: number): number[] {
  const raw = Math.max(1, (max - min) / 5);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].find((factor) => factor * magnitude >= raw) ?? 10) * magnitude;
  const ticks: number[] = [];

  for (let tick = Math.floor(min / step) * step; tick < max + step; tick += step) {
    ticks.push(tick);
    if (tick >= max) break;
  }

  return ticks;
}
