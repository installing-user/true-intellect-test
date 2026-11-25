import type { AnalyticsSummary, DayMetrics, ReviewStats } from 'contracts';

export type { DayMetrics, ReviewStats };

export function summarize(days: DayMetrics[], reviews: ReviewStats): AnalyticsSummary {
  const summary: AnalyticsSummary = { views: 0, siteClicks: 0, calls: 0, routes: 0, ...reviews };

  for (const day of days) {
    summary.views += day.views;
    summary.siteClicks += day.siteClicks;
    summary.calls += day.calls;
    summary.routes += day.routes;
  }

  return summary;
}
