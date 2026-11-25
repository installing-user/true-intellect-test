import type { ButtonHTMLAttributes } from 'react';
import './button.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  size?: 'md' | 'sm';
}

export function Button({ variant = 'secondary', size = 'md', className, type = 'button', ...props }: ButtonProps) {
  const classes = ['btn', variant === 'secondary' && 'btn-secondary', size === 'sm' && 'btn-sm', className];

  return <button type={type} className={classes.filter(Boolean).join(' ')} {...props} />;
}
