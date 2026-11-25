import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../shared/infrastructure/database.service.js';
import { Period } from 'contracts';
import { Scope } from '../../tenancy/domain/scope.js';
import { DayMetrics, ReviewStats } from 'contracts';

@Injectable()
export class AnalyticsRepository {
  constructor(private readonly database: DatabaseService) {}

  timeseries(scope: Scope, period: Period): Promise<DayMetrics[]> {
    if (scope.branchId === null) return this.companyTimeseries(scope.companyId, period);

    return this.branchTimeseries(scope, period);
  }

  async latestDay(scope: Scope): Promise<string | null> {
    if (scope.branchId === null) {
      const [row] = await this.database.query<{ day: string | null }>(
        `SELECT to_char(max(date), 'YYYY-MM-DD') AS day
         FROM company_daily_metrics WHERE ($1::int IS NULL OR company_id = $1)`,
        [scope.companyId],
      );

      return row.day;
    }

    const [row] = await this.database.query<{ day: string | null }>(
      `SELECT to_char(max(m.date), 'YYYY-MM-DD') AS day
       FROM daily_metrics m JOIN branches b ON b.id = m.branch_id
       WHERE ($1::int IS NULL OR b.company_id = $1) AND b.id = $2`,
      [scope.companyId, scope.branchId],
    );

    return row.day;
  }

  // per-company daily totals are kept by triggers on daily_metrics (migration 003)
  private companyTimeseries(companyId: number | null, period: Period): Promise<DayMetrics[]> {
    return this.database.query<DayMetrics>(
      `SELECT to_char(d, 'YYYY-MM-DD') AS date,
              coalesce(sum(t.views), 0)::int AS views,
              coalesce(sum(t.site_clicks), 0)::int AS "siteClicks",
              coalesce(sum(t.calls), 0)::int AS calls,
              coalesce(sum(t.routes), 0)::int AS routes
       FROM generate_series($2::date, $3::date, interval '1 day') d
       LEFT JOIN company_daily_metrics t
         ON t.date = d::date AND ($1::int IS NULL OR t.company_id = $1) AND t.date BETWEEN $2::date AND $3::date
       GROUP BY d ORDER BY d`,
      [companyId, period.from, period.to],
    );
  }

  // the date range on daily_metrics itself lets the planner use the (branch_id, date) key
  private branchTimeseries(scope: Scope, period: Period): Promise<DayMetrics[]> {
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
