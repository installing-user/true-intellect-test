import type { ComponentPropsWithoutRef } from 'react';
import './skeleton.css';

export function Skeleton({ className, ...props }: ComponentPropsWithoutRef<'span'>) {
  return <span className={className ? `skeleton ${className}` : 'skeleton'} aria-hidden="true" {...props} />;
}

export function SkeletonRegion({ className, children, ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={className ? `skeleton-region skeleton-delay ${className}` : 'skeleton-region skeleton-delay'}
      aria-busy="true"
      {...props}
    >
      <span className="sr-only">Загрузка…</span>
      {children}
    </div>
  );
}

export function SkeletonBlock() {
  return (
    <SkeletonRegion className="skeleton-stack">
      <Skeleton />
      <Skeleton style={{ width: '55%' }} />
      <Skeleton style={{ height: 40 }} />
      <Skeleton style={{ width: '80%' }} />
    </SkeletonRegion>
  );
}
