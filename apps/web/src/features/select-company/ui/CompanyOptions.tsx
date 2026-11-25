'use client';

import { useEffect, useRef, useState } from 'react';
import type { Company } from '@/entities/company';
import { Icon } from '@/shared/ui/icon';
import './company-picker.css';

interface CompanyOptionsProps {
  companies: Company[];
  selectedId: string | null;
  allHint?: string;
  hint: (company: Company) => string | undefined;
  onSelect: (id: string | null) => void;
  open: boolean;
  onClose: () => void;
}

export function CompanyOptions({ companies, selectedId, allHint, hint, open, onSelect, onClose }: CompanyOptionsProps) {
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    searchRef.current?.focus();
    const control = rootRef.current!.parentElement!;

    const close = (event: PointerEvent) => {
      if (!control.contains(event.target as Node)) onClose();
    };

    document.addEventListener('pointerdown', close);

    return () => document.removeEventListener('pointerdown', close);
  }, [open]); // onClose is a new closure on every render, so it stays out of the deps

  function focusTrigger() {
    rootRef.current?.parentElement?.querySelector('button')?.focus();
  }

  function choose(id: string | null) {
    onSelect(id);
    focusTrigger();
  }

  const needle = query.trim().toLowerCase();
  const visible = companies.filter((company) => company.name.toLowerCase().includes(needle));

  return (
    <div
      ref={rootRef}
      id="company-picker"
      className="company-picker popover"
      data-open={open}
      onKeyDown={(event) => event.key === 'Escape' && (onClose(), focusTrigger())}
      onBlur={(event) =>
        event.relatedTarget && !event.currentTarget.parentElement!.contains(event.relatedTarget) && onClose()
      }
    >
      <div className="company-search">
        <span className="company-search-icon">
          <Icon name="search" />
        </span>
        <input
          ref={searchRef}
          type="search"
          placeholder="Найти компанию"
          aria-label="Найти компанию"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="company-options" role="group" aria-label="Компании">
        <button type="button" aria-pressed={!selectedId} className="company-option" onClick={() => choose(null)}>
          <span className="company-option-text">
            <span className="company-option-name">Все компании</span>
            {allHint && <span className="company-option-sub">{allHint}</span>}
          </span>
          {!selectedId && <Icon name="check" size={18} />}
        </button>
        {visible.map((company) => {
          const selected = String(company.id) === selectedId;
          const sub = hint(company);

          return (
            <button
              key={company.id}
              type="button"
              aria-pressed={selected}
              className="company-option"
              onClick={() => choose(String(company.id))}
            >
              <span className="company-option-text">
                <span className="company-option-name" title={company.name}>
                  {company.name}
                </span>
                {sub !== undefined && <span className="company-option-sub">{sub}</span>}
              </span>
              {selected && <Icon name="check" size={18} />}
            </button>
          );
        })}
        {visible.length === 0 && <p className="company-empty">Ничего не найдено</p>}
      </div>
    </div>
  );
}
