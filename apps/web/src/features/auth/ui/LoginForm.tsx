'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { ApiError, apiFetch } from '@/shared/api';
import { Icon, Spinner } from '@/shared/ui/icon';
import './login-form.css';

const INVALID_CREDENTIALS = 'Неверный email или пароль';

function tooManyAttempts(error: ApiError): string {
  const seconds = Number(error.headers?.get('retry-after'));
  const base = 'Слишком много попыток входа.';
  return seconds > 0 ? `${base} Попробуйте через ${Math.ceil(seconds / 60)} мин.` : `${base} Попробуйте позже.`;
}

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [shake, setShake] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      });
      router.replace('/dashboard');
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 401
          ? INVALID_CREDENTIALS
          : e instanceof ApiError && e.status === 429
            ? tooManyAttempts(e)
            : 'Не удалось войти, попробуйте ещё раз',
      );
      setShake(true);
      setPending(false);
    }
  }

  const invalid = error === INVALID_CREDENTIALS || undefined;

  return (
    <form
      className={shake ? 'login-form shake' : 'login-form'}
      onSubmit={submit}
      onAnimationEnd={(e) => e.animationName === 'shake' && setShake(false)}
    >
      <h1>Вход в кабинет</h1>
      <label>
        Email
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          aria-invalid={invalid}
          aria-describedby={invalid && 'login-error'}
        />
      </label>
      <label>
        Пароль
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={invalid}
          aria-describedby={invalid && 'login-error'}
        />
      </label>
      {error && (
        <p className="alert" role="alert" id="login-error">
          <Icon name="alert" />
          {error}
        </p>
      )}
      <button type="submit" disabled={pending}>
        {pending ? (
          <>
            <Spinner />
            Входим…
          </>
        ) : (
          'Войти'
        )}
      </button>
    </form>
  );
}
