import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { createPeriod, Period } from '../domain/period.js';

export const MAX_INT = 2_147_483_647;

const PARAM_LABEL: Record<string, string> = {
  from: 'с',
  to: 'по',
  rating: 'оценка',
  limit: 'лимит',
  offset: 'смещение',
};

function single(value: unknown, name: string | undefined): string | undefined {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string')
    throw new BadRequestException(`Параметр «${PARAM_LABEL[name ?? ''] ?? name}» должен быть указан один раз`);

  return value;
}

@Injectable()
export class SingleValuePipe implements PipeTransform<unknown, string | undefined> {
  transform(value: unknown, { data }: ArgumentMetadata): string | undefined {
    return single(value, data);
  }
}

function invalidIdMessage(name: string | undefined): string {
  if (name === 'companyId') return 'Неверная компания';
  if (name === 'branchId') return 'Неверный филиал';

  return `Неверное значение «${name}»`;
}

@Injectable()
export class ParseIdPipe implements PipeTransform<unknown, number | undefined> {
  transform(value: unknown, { data }: ArgumentMetadata): number | undefined {
    const text = single(value, data);

    if (text === undefined) return undefined;
    const id = Number(text);

    if (!/^[1-9]\d*$/.test(text) || id > MAX_INT) throw new BadRequestException(invalidIdMessage(data));

    return id;
  }
}

export class ParseIntRangePipe implements PipeTransform<unknown, number | undefined> {
  constructor(
    private readonly min: number,
    private readonly max: number,
  ) {}

  transform(value: unknown, { data }: ArgumentMetadata): number | undefined {
    const text = single(value, data);

    if (text === undefined) return undefined;
    const number = Number(text);

    if (!/^\d+$/.test(text) || number < this.min || number > this.max) {
      throw new BadRequestException(
        `Неверное значение «${PARAM_LABEL[data ?? ''] ?? data}»: нужно целое число от ${this.min} до ${this.max}`,
      );
    }

    return number;
  }
}

// applied to the whole query object because from and to are validated together
export class ParsePeriodPipe implements PipeTransform<Record<string, unknown>, Period | null> {
  constructor(private readonly optional = false) {}

  transform(query: Record<string, unknown>): Period | null {
    const from = single(query.from, 'from');
    const to = single(query.to, 'to');

    if (this.optional && from === undefined && to === undefined) return null;

    return createPeriod(from, to);
  }
}
