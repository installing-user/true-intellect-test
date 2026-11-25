import { ReviewCardSkeleton } from '@/entities/review';
import { Skeleton, SkeletonRegion } from '@/shared/ui/skeleton';

export function ReviewsSkeleton() {
  return (
    <SkeletonRegion>
      <ul className="rv-list">
        {Array.from({ length: 6 }, (_, i) => (
          <ReviewCardSkeleton key={i} />
        ))}
      </ul>
      <div className="rv-pager" aria-hidden="true">
        <Skeleton className="skel-pager-btn" />
        <Skeleton className="skel-pager-count" />
        <Skeleton className="skel-pager-btn" />
      </div>
    </SkeletonRegion>
  );
}
