import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../shared/infrastructure/database.service.js';
import { Period } from '../../shared/domain/period.js';
import { Scope } from '../../tenancy/domain/scope.js';
import { DayMetrics, ReviewStats } from '../domain/metrics.js';

@Injectable()
export class AnalyticsRepository {
  constructor(private readonly database: DatabaseService) {}

  // the date range on daily_metrics itself lets the planner use the (branch_id, date) key and the date index
  timeseries(scope: Scope, period: Period): Promise<DayMetrics[]> {
    return this.database.query<DayMetrics>(
      `SELECT to_char(d, 'YYYY-MM-DD') AS date,
              coalesce(sum(m.views), 0)::int AS views,
              coalesce(sum(m.site_clicks), 0)::int AS "siteClicks",
              coalesce(sum(m.calls), 0)::int AS calls,
              coalesce(sum(m.routes), 0)::int AS routes
       FROM generate_series($3::date, $4::date, interval '1 day') d
       LEFT JOIN (daily_metrics m JOIN branches b ON b.id = m.branch_id
                  AND ($1::int IS NULL OR b.company_id = $1)
                  AND ($2::int IS NULL OR b.id = $2)
                  AND m.date BETWEEN $3::date AND $4::date)
         ON m.date = d::date
       GROUP BY d ORDER BY d`,
      [scope.companyId, scope.branchId, period.from, period.to],
    );
  }

  async latestDay(scope: Scope): Promise<string | null> {
    const [row] = await this.database.query<{ day: string | null }>(
      `SELECT to_char(max(m.date), 'YYYY-MM-DD') AS day
       FROM daily_metrics m JOIN branches b ON b.id = m.branch_id
       WHERE ($1::int IS NULL OR b.company_id = $1) AND ($2::int IS NULL OR b.id = $2)`,
      [scope.companyId, scope.branchId],
    );
    return row.day;
  }

  async reviewStats(scope: Scope, period: Period): Promise<ReviewStats> {
    const [stats] = await this.database.query<ReviewStats>(
      `SELECT round(avg(r.rating), 1)::float8 AS "avgRating", count(*)::int AS "reviewsCount"
       FROM reviews r JOIN branches b ON b.id = r.branch_id
       WHERE ($1::int IS NULL OR b.company_id = $1)
         AND ($2::int IS NULL OR b.id = $2)
         AND r.published_at >= $3::date::timestamp AT TIME ZONE 'UTC'
         AND r.published_at < ($4::date + 1)::timestamp AT TIME ZONE 'UTC'`,
      [scope.companyId, scope.branchId, period.from, period.to],
    );
    return stats;
  }
}
