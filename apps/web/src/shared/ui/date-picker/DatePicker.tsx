'use client';

import { type ClipboardEvent, type KeyboardEvent, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '@/shared/ui/icon';
import { Select } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import './date-picker.css';

interface DatePickerProps {
  label: string;
  value: string;
  min: string;
  max: string;
  onCommit: (value: string) => void;
  anchor?: string;
  loading?: boolean;
  className?: string;
}

const DAY_MS = 86_400_000;
const POP_WIDTH = 336;
const POP_MOBILE_MIN = 296;
const EDGE = 8;
const EDGE_MOBILE = 4;

const toIso = (time: number) => new Date(time).toISOString().slice(0, 10);
const parse = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const addDays = (iso: string, days: number) => toIso(parse(iso) + days * DAY_MS);
const weekday = (iso: string) => (new Date(parse(iso)).getUTCDay() + 6) % 7;
const clamp = (iso: string, min: string, max: string) => (iso < min ? min : iso > max ? max : iso);
const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1);

function addMonths(iso: string, months: number) {
  const [y, m, d] = iso.split('-').map(Number);
  const last = new Date(Date.UTC(y, m + months, 0)).getUTCDate();
  return toIso(Date.UTC(y, m - 1 + months, Math.min(d, last)));
}

const monthNames = Array.from({ length: 12 }, (_, i) =>
  capitalize(new Intl.DateTimeFormat('ru', { month: 'long', timeZone: 'UTC' }).format(Date.UTC(2000, i, 1))),
);
const weekdayNames = Array.from({ length: 7 }, (_, i) =>
  capitalize(new Intl.DateTimeFormat('ru', { weekday: 'short', timeZone: 'UTC' }).format(Date.UTC(2024, 0, 1 + i))),
);
const dayLabel = new Intl.DateTimeFormat('ru', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

const mask = (digits: string) => [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join('.');
const toDigits = (iso: string) => iso.slice(8, 10) + iso.slice(5, 7) + iso.slice(0, 4);

function fromDigits(digits: string) {
  if (digits.length !== 8) return null;
  const iso = `${digits.slice(4)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
  const time = parse(iso);
  return Number.isNaN(time) || toIso(time) !== iso ? null : iso;
}

export function DatePicker({ label, value, min, max, onCommit, anchor, loading = false, className }: DatePickerProps) {
  const id = useId();
  const inputId = `${id}-input`;
  const popId = `${id}-dialog`;
  const titleId = `${id}-title`;
  const rootRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const caret = useRef<number | null>(null);
  const focusGrid = useRef(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [focusDay, setFocusDay] = useState(() => clamp(value || toIso(Date.now()), min, max));
  const [hover, setHover] = useState<string | null>(null);

  const today = toIso(Date.now());
  const view = focusDay.slice(0, 8) + '01';
  const viewYear = Number(view.slice(0, 4));
  const start = addDays(view, -weekday(view));
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const shown = draft ?? (value ? mask(toDigits(value)) : '');
  const committable = (iso: string | null) => iso !== null && iso >= min && iso <= max;
  const invalid = draft !== null && draft.length === 10 && !committable(fromDigits(draft.replace(/\D/g, '')));
  const edge = hover ?? value;
  const [rangeFrom, rangeTo] = anchor && edge ? [edge, anchor].sort() : ['', ''];
  const minYear = Number(min.slice(0, 4));
  const years = Array.from({ length: Number(max.slice(0, 4)) - minYear + 1 }, (_, i) => String(minYear + i));

  function moveTo(iso: string, grid = false) {
    setFocusDay(clamp(iso, min, max));
    focusGrid.current = grid;
  }

  function show(grid: boolean) {
    moveTo(value || today, grid);
    setHover(null);
    setOpen(true);
  }

  function close(returnFocus: boolean) {
    setOpen(false);
    setHover(null);
    if (returnFocus) inputRef.current?.focus();
  }

  function choose(iso: string) {
    if (iso < min || iso > max) return;
    setDraft(null);
    if (iso !== value) onCommit(iso);
    close(true);
  }

  function type(digits: string, caretDigits = digits.length) {
    const iso = fromDigits(digits);
    setDraft(mask(digits));
    caret.current = caretDigits;
    if (iso && committable(iso)) {
      setFocusDay(iso);
      if (iso !== value) onCommit(iso);
    }
  }

  function paste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text').trim();
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    const digits = iso ? iso[3] + iso[2] + iso[1] : text.replace(/\D/g, '');
    if (!iso && digits.length !== 8) return;
    e.preventDefault();
    type(digits);
  }

  function onInputKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.altKey && e.key === 'ArrowDown') {
      e.preventDefault();
      show(true);
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      close(false);
    }
  }

  function onGridKey(e: KeyboardEvent<HTMLTableElement>) {
    const step: Record<string, () => string> = {
      ArrowLeft: () => addDays(focusDay, -1),
      ArrowRight: () => addDays(focusDay, 1),
      ArrowUp: () => addDays(focusDay, -7),
      ArrowDown: () => addDays(focusDay, 7),
      Home: () => addDays(focusDay, -weekday(focusDay)),
      End: () => addDays(focusDay, 6 - weekday(focusDay)),
      PageUp: () => addMonths(focusDay, e.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focusDay, e.shiftKey ? 12 : 1),
    };
    if (step[e.key]) {
      e.preventDefault();
      moveTo(step[e.key](), true);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(focusDay);
    }
  }

  function onDialogKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape' && !e.defaultPrevented) {
      e.preventDefault();
      close(true);
      return;
    }
    if (e.key !== 'Tab') return;
    const items = [...popRef.current!.querySelectorAll<HTMLElement>('button, [tabindex="0"]')];
    const edgeItem = e.shiftKey ? items[0] : items[items.length - 1];
    if (document.activeElement === edgeItem) {
      e.preventDefault();
      (e.shiftKey ? items[items.length - 1] : items[0]).focus();
    }
  }

  useLayoutEffect(() => {
    if (caret.current === null || !inputRef.current) return;
    let pos = 0;
    for (let seen = 0; pos < shown.length && seen < caret.current; pos++) if (/\d/.test(shown[pos])) seen++;
    inputRef.current.setSelectionRange(pos, pos);
    caret.current = null;
  });

  useLayoutEffect(() => {
    if (!open) return;
    const pop = popRef.current!;
    const control = controlRef.current!.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const edge = vw <= 480 ? EDGE_MOBILE : EDGE;
    const width = Math.min(vw - 2 * edge, Math.max(control.width, vw <= 480 ? POP_MOBILE_MIN : POP_WIDTH));
    const left = Math.min(Math.max(control.left, edge), vw - edge - width) - control.left;
    pop.style.width = `${width}px`;
    pop.style.left = `${left}px`;
    pop.style.right = 'auto';
    const below = window.innerHeight - control.bottom;
    pop.dataset.up = String(below < pop.offsetHeight + 16 && control.top > below);
  }, [open]);

  useEffect(() => {
    if (!open || !focusGrid.current) return;
    focusGrid.current = false;
    popRef.current?.querySelector<HTMLElement>('td[tabindex="0"]')?.focus();
  });

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={['field date-picker', className].filter(Boolean).join(' ')}
      onBlur={(e) => {
        if (open && e.relatedTarget && !rootRef.current?.contains(e.relatedTarget)) close(false);
      }}
    >
      <label htmlFor={inputId}>{label}</label>
      <div ref={controlRef} className="dp-control" aria-busy={loading || undefined}>
        <input
          ref={inputRef}
          id={inputId}
          className="dp-input"
          inputMode="numeric"
          autoComplete="off"
          placeholder={loading && !shown ? '' : 'дд.мм.гггг'}
          value={shown}
          aria-invalid={invalid || undefined}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={popId}
          onChange={(e) => {
            const raw = e.target.value;
            type(raw.replace(/\D/g, '').slice(0, 8), raw.slice(0, e.target.selectionStart ?? raw.length).replace(/\D/g, '').length);
          }}
          onPaste={paste}
          onKeyDown={onInputKey}
          onClick={() => !open && show(false)}
          onBlur={() => setDraft(null)}
        />
        {loading && !shown && <Skeleton className="dp-skeleton" />}
        <button
          type="button"
          className="dp-toggle"
          aria-label={value ? `Выбрать дату «${label}», выбрано ${dayLabel.format(parse(value))}` : `Выбрать дату «${label}»`}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={popId}
          onClick={() => (open ? close(true) : show(true))}
        >
          <Icon name="calendar" />
        </button>
        <div
          ref={popRef}
          id={popId}
          role="dialog"
          aria-modal="true"
          aria-label={`Календарь «${label}»`}
          className="dp-pop popover"
          data-open={open}
          onKeyDown={onDialogKey}
        >
          <div className="dp-head">
            <button
              type="button"
              className="dp-nav"
              aria-label="Предыдущий месяц"
              aria-disabled={view <= min || undefined}
              onClick={() => view > min && moveTo(addMonths(focusDay, -1))}
            >
              <Icon name="chevronLeft" />
            </button>
            <Select
              className="dp-month"
              aria-label="Месяц"
              value={String(Number(view.slice(5, 7)) - 1)}
              options={monthNames.map((name, i) => ({ value: String(i), label: name }))}
              onChange={(m) => moveTo(addMonths(focusDay, Number(m) - Number(view.slice(5, 7)) + 1))}
            />
            <Select
              className="dp-year"
              aria-label="Год"
              value={String(viewYear)}
              options={years.map((y) => ({ value: y, label: y }))}
              onChange={(y) => moveTo(addMonths(focusDay, (Number(y) - viewYear) * 12))}
            />
            <button
              type="button"
              className="dp-nav"
              aria-label="Следующий месяц"
              aria-disabled={addMonths(view, 1) > max || undefined}
              onClick={() => addMonths(view, 1) <= max && moveTo(addMonths(focusDay, 1))}
            >
              <Icon name="chevronRight" />
            </button>
          </div>
          <h2 id={titleId} className="sr-only" aria-live="polite">
            {monthNames[Number(view.slice(5, 7)) - 1]} {viewYear}
          </h2>
          <table role="grid" aria-labelledby={titleId} className="dp-grid" onKeyDown={onGridKey} onPointerLeave={() => setHover(null)}>
            <thead>
              <tr>
                {weekdayNames.map((name) => (
                  <th key={name} scope="col" abbr={name}>
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }, (_, row) => (
                <tr key={row}>
                  {days.slice(row * 7, row * 7 + 7).map((day) => {
                    const disabled = day < min || day > max;
                    const classes = [
                      day.slice(0, 8) !== view.slice(0, 8) && 'is-outside',
                      day >= rangeFrom && day <= rangeTo && 'in-range',
                      day === rangeFrom && 'range-start',
                      day === rangeTo && 'range-end',
                    ];
                    return (
                      <td
                        key={day}
                        className={classes.filter(Boolean).join(' ') || undefined}
                        tabIndex={day === focusDay ? 0 : -1}
                        aria-label={dayLabel.format(parse(day))}
                        aria-selected={day === value}
                        aria-disabled={disabled || undefined}
                        aria-current={day === today ? 'date' : undefined}
                        onPointerEnter={() => setHover(disabled || !anchor ? null : day)}
                        onClick={() => choose(day)}
                      >
                        <span className="dp-day">{Number(day.slice(8))}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
