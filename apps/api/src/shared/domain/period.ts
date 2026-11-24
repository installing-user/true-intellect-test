import { InvalidInputError } from './invalid-input.error.js';

export interface Period {
  from: string;
  to: string;
}

const DAY_MS = 86_400_000;
const MAX_PERIOD_DAYS = 366;
const DEFAULT_PERIOD_DAYS = 30;
const MIN_DAY = '2000-01-01';
const MAX_DAY = '2100-12-31';
const DAY_LABEL: Record<string, string> = { from: 'с', to: 'по' };

const ru = (day: string) => day.split('-').reverse().join('.');

function toDay(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

function parseDay(value: string, name: string): number {
  const time = Date.parse(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(time) || toDay(time) !== value) {
    throw new InvalidInputError(`Дата «${DAY_LABEL[name]}» должна быть в формате ГГГГ-ММ-ДД`);
  }
  // JS accepts year 0000, PostgreSQL does not; outside this range the input is a typo or a probe
  if (value < MIN_DAY || value > MAX_DAY) {
    throw new InvalidInputError(`Дата «${DAY_LABEL[name]}» должна быть между ${ru(MIN_DAY)} и ${ru(MAX_DAY)}`);
  }
  return time;
}

// dates are UTC calendar days; both bounds are inclusive
export function createPeriod(from?: string, to?: string, now = Date.now()): Period {
  const toTime = to === undefined ? Date.parse(`${toDay(now)}T00:00:00Z`) : parseDay(to, 'to');
  const fromTime = from === undefined ? toTime - (DEFAULT_PERIOD_DAYS - 1) * DAY_MS : parseDay(from, 'from');
  if (fromTime > toTime) throw new InvalidInputError('Дата «с» позже даты «по»');
  if ((toTime - fromTime) / DAY_MS + 1 > MAX_PERIOD_DAYS) {
    throw new InvalidInputError(`Период не может быть длиннее ${MAX_PERIOD_DAYS} дней`);
  }
  return { from: toDay(fromTime), to: toDay(toTime) };
}
