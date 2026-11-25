import { Panel } from '@/shared/ui/panel';
import { Skeleton } from '@/shared/ui/skeleton';
import './review-card.css';

export function ReviewCardSkeleton() {
  return (
    <Panel as="li" className="review-card review-card-skeleton">
      <div className="review-card-head">
        <Skeleton className="skel-author" />
        <Skeleton className="skel-badge" />
      </div>
      <div className="review-card-meta">
        <Skeleton style={{ width: 98, height: 18 }} />
        <Skeleton style={{ width: 44, height: 14 }} />
        <Skeleton style={{ width: 170, height: 14 }} />
      </div>
      <div className="skel-text">
        <Skeleton />
        <Skeleton style={{ width: '70%' }} />
      </div>
    </Panel>
  );
}
