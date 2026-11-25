import type { ReactNode } from 'react';
import { Icon } from '@/shared/ui/icon';
import './company-picker.css';

export function CompanyField({
  label,
  open,
  disabled,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  disabled: boolean;
  onToggle: () => void;
  children?: ReactNode;
}) {
  return (
    <>
      <span id="company-label">Компания</span>
      <div className="company-control">
        <button
          type="button"
          className="company-select"
          aria-expanded={open}
          aria-controls="company-picker"
          aria-labelledby="company-label company-value"
          disabled={disabled}
          onClick={onToggle}
        >
          <span id="company-value">{label}</span>
          <span className="company-select-icon">
            <Icon name="chevronDown" />
          </span>
        </button>
        {children}
      </div>
    </>
  );
}
