export interface DayMetrics {
  date: string;
  views: number;
  siteClicks: number;
  calls: number;
  routes: number;
}

export interface ReviewStats {
  avgRating: number | null;
  reviewsCount: number;
}

export function summarize(days: DayMetrics[], reviews: ReviewStats) {
  const summary = { views: 0, siteClicks: 0, calls: 0, routes: 0, ...reviews };
  for (const day of days) {
    summary.views += day.views;
    summary.siteClicks += day.siteClicks;
    summary.calls += day.calls;
    summary.routes += day.routes;
  }
  return summary;
}
