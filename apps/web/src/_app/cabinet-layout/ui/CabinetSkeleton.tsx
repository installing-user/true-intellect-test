import { Brand } from '@/shared/ui/brand';
import { Skeleton } from '@/shared/ui/skeleton';

export function CabinetSkeleton() {
  return (
    <>
      <header className="header skeleton-delay">
        <div className="header-inner">
          <Brand />
          <div className="nav" aria-hidden="true">
            <Skeleton className="skel-nav" style={{ width: 104 }} />
            <Skeleton className="skel-nav" style={{ width: 88 }} />
          </div>
          <div className="user" aria-hidden="true">
            <Skeleton className="skel-email" />
            <Skeleton className="skel-logout" />
          </div>
        </div>
      </header>
      <main className="page skeleton-delay" aria-busy="true">
        <span role="status" className="sr-only">
          Загрузка…
        </span>
        <span className="skel-title">
          <Skeleton />
        </span>
      </main>
    </>
  );
}
