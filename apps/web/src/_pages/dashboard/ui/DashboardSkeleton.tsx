import { Panel } from '@/shared/ui/panel';
import { Skeleton, SkeletonRegion } from '@/shared/ui/skeleton';

const bar = (width: string, height: number) => ({ width, height });

export function MetricsSkeleton() {
  return (
    <SkeletonRegion>
      <ul className="dash-metrics">
        {Array.from({ length: 6 }, (_, i) => (
          <Panel as="li" key={i} className="dash-metric">
            <span className={i % 4 === 0 ? 'skel-line skel-title skel-wrap' : 'skel-line skel-title'}>
              <Skeleton style={bar(i % 2 ? '55%' : '70%', 14)} />
              {i % 4 === 0 && <Skeleton className="skel-wrap-2" style={bar('45%', 14)} />}
            </span>
            <span className="skel-line skel-metric-value">
              <Skeleton style={bar('50%', 28)} />
            </span>
          </Panel>
        ))}
      </ul>
    </SkeletonRegion>
  );
}

export function ChartSkeleton() {
  return (
    <SkeletonRegion>
      <div className="skel-chart">
        <div className="skel-chart-ticks">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} style={bar('28px', 10)} />
          ))}
        </div>
        <div className="skel-chart-plot">
          <Skeleton className="skel-chart-area" />
        </div>
        <div className="skel-chart-axis">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} style={bar('36px', 10)} />
          ))}
        </div>
      </div>
    </SkeletonRegion>
  );
}

export function BranchesSkeleton() {
  return (
    <SkeletonRegion>
      <ul className="dash-list">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="skel-row">
            <Skeleton style={bar(i % 2 ? '45%' : '60%', 14)} />
            <Skeleton style={bar('80%', 12)} />
          </li>
        ))}
      </ul>
    </SkeletonRegion>
  );
}
