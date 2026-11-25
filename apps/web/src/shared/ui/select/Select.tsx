'use client';

import { type KeyboardEvent, type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Icon, type IconName } from '@/shared/ui/icon';
import './select.css';

export interface SelectOption {
  value: string;
  label: string;
  icon?: IconName;
}

interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  label?: ReactNode;
  'aria-label'?: string;
  placeholder?: string;
  disabled?: boolean;
  variant?: 'field' | 'pill';
  className?: string;
}

const PAGE_STEP = 10;

export function Select({
  value,
  options,
  onChange,
  label,
  'aria-label': ariaLabel,
  placeholder = 'Выберите',
  disabled = false,
  variant = 'field',
  className,
}: SelectProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const listId = `${id}-list`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef({ text: '', timer: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [up, setUp] = useState(false);

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = options[selectedIndex];

  function show(index = selectedIndex) {
    if (disabled || options.length === 0) return;
    setActive(Math.max(0, index));
    setOpen(true);
  }

  function choose(index: number) {
    setOpen(false);
    const option = options[index];

    if (option && option.value !== value) onChange(option.value);
  }

  function findByText(char: string) {
    const search = typeahead.current;

    window.clearTimeout(search.timer);
    search.timer = window.setTimeout(() => (search.text = ''), 500);
    search.text = search.text === char ? char : search.text + char;
    const start = open ? active + (search.text.length === 1 ? 1 : 0) : Math.max(0, selectedIndex) + 1;
    const ordered = [...options.slice(start), ...options.slice(0, start)];
    const match = ordered.find((option) => option.label.toLowerCase().startsWith(search.text));

    return match ? options.indexOf(match) : -1;
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    const last = options.length - 1;

    const move = (index: number) => {
      event.preventDefault();
      if (open) setActive(Math.min(last, Math.max(0, index)));
      else show(Math.min(last, Math.max(0, index)));
    };

    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ')
        return move(selectedIndex < 0 ? 0 : selectedIndex);
      if (event.key === 'ArrowUp') return move(selectedIndex < 0 ? 0 : selectedIndex);
      if (event.key === 'Home') return move(0);
      if (event.key === 'End') return move(last);
    } else {
      if (event.altKey && event.key === 'ArrowUp') {
        event.preventDefault();

        return choose(active);
      }

      if (event.key === 'ArrowDown') return move(active + 1);
      if (event.key === 'ArrowUp') return move(active - 1);
      if (event.key === 'Home') return move(0);
      if (event.key === 'End') return move(last);
      if (event.key === 'PageDown') return move(active + PAGE_STEP);
      if (event.key === 'PageUp') return move(active - PAGE_STEP);

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();

        return choose(active);
      }

      if (event.key === 'Escape') {
        event.preventDefault();

        return setOpen(false);
      }

      if (event.key === 'Tab') return choose(active);
    }

    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && event.key !== ' ') {
      const index = findByText(event.key.toLowerCase());

      if (index >= 0) move(index);
    }
  }

  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current!.getBoundingClientRect();
    const below = window.innerHeight - trigger.bottom;

    setUp(below < listRef.current!.offsetHeight + 16 && trigger.top > below);
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active, id]);

  useEffect(() => {
    if (!open) return;

    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener('pointerdown', close);

    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  useEffect(() => () => window.clearTimeout(typeahead.current.timer), []);

  const rootClass = ['select', variant === 'pill' ? 'select-pill' : 'field', className].filter(Boolean).join(' ');

  return (
    <div ref={rootRef} className={rootClass}>
      {label && (
        <span id={labelId} className="select-label" onClick={() => triggerRef.current?.focus()}>
          {label}
        </span>
      )}
      <div className="select-control">
        <div
          ref={triggerRef}
          role="combobox"
          tabIndex={disabled ? -1 : 0}
          className="select-trigger"
          aria-labelledby={label ? labelId : undefined}
          aria-label={label ? undefined : ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open ? `${id}-${active}` : undefined}
          aria-disabled={disabled || undefined}
          onClick={() => (open ? setOpen(false) : show())}
          onKeyDown={onKeyDown}
          onBlur={() => setOpen(false)}
        >
          {selected?.icon && <Icon name={selected.icon} size={18} />}
          <span className={selected ? 'select-value' : 'select-value select-placeholder'}>
            {selected?.label ?? placeholder}
          </span>
          <span className="select-chevron">
            <Icon name="chevronDown" />
          </span>
        </div>
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={label ? labelId : undefined}
          aria-label={label ? undefined : ariaLabel}
          className="select-list popover"
          data-open={open}
          data-up={up}
          onMouseDown={(event) => event.preventDefault()}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${id}-${index}`}
              role="option"
              aria-selected={index === selectedIndex}
              className={index === active ? 'select-option is-active' : 'select-option'}
              onPointerMove={() => index !== active && setActive(index)}
              onClick={() => choose(index)}
            >
              {option.icon && <Icon name={option.icon} size={18} />}
              <span className="select-option-text" title={option.label}>
                {option.label}
              </span>
              {index === selectedIndex && (
                <span className="select-check">
                  <Icon name="check" size={18} />
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
