import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import type { ApiError } from '@/shared/api';
import { Button } from '../button';
import { Icon, type IconName } from '../icon';
import { SkeletonBlock } from '../skeleton';
import './data-state.css';

export function StateMessage({ className, ...props }: ComponentPropsWithoutRef<'p'>) {
  return <p className={className ? `state ${className}` : 'state'} {...props} />;
}

export function EmptyState({ icon = 'inbox', children }: { icon?: IconName; children: ReactNode }) {
  return (
    <div className="state">
      <span className="state-icon">
        <Icon name={icon} size={22} />
      </span>
      <p>{children}</p>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  onReset,
  className,
}: {
  message: string;
  onRetry?: () => void;
  onReset?: () => void;
  className?: string;
}) {
  return (
    <div className={className ? `state state-error ${className}` : 'state state-error'} role="alert">
      <span className="state-icon">
        <Icon name="alert" size={22} />
      </span>
      <p>{message}</p>
      {onRetry && (
        <Button onClick={onRetry}>
          <Icon name="retry" />
          Повторить
        </Button>
      )}
      {onReset && <Button onClick={onReset}>Сбросить фильтры</Button>}
    </div>
  );
}

export function DataState<T>({
  state,
  notFound,
  onReset,
  skeleton,
  children,
}: {
  state: { data?: T; error?: ApiError; loading: boolean; refetching?: boolean; retry: () => void };
  notFound: string;
  onReset?: () => void;
  skeleton?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  if (state.loading && state.data === undefined) return skeleton ?? <SkeletonBlock />;
  if (state.error?.status === 404) {
    return (
      <div className="state" role="alert">
        <span className="state-icon">
          <Icon name="search" size={22} />
        </span>
        <p>{notFound}</p>
        {onReset && <Button onClick={onReset}>Сбросить фильтр</Button>}
      </div>
    );
  }
  // 400 is a validation error: the server message says what to fix and a retry cannot help
  if (state.error?.status === 400) return <ErrorState message={state.error.message} onReset={onReset} />;
  if (state.error || state.data === undefined) return <ErrorState message="Не удалось загрузить данные." onRetry={state.retry} />;
  return (
    <>
      <div className="data-fade" data-busy={state.refetching || undefined} aria-busy={state.refetching || undefined}>
        {children(state.data)}
      </div>
      {state.refetching && <span className="data-progress" aria-hidden="true" />}
    </>
  );
}
