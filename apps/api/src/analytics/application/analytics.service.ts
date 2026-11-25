import { Injectable } from '@nestjs/common';
import { SessionUser } from 'contracts';
import { createPeriod } from '../../shared/domain/period.js';
import { AccessService } from '../../tenancy/application/access.service.js';
import { ScopeRequest } from '../../tenancy/domain/scope.js';
import { summarize } from '../domain/metrics.js';
import { AnalyticsRepository } from '../infrastructure/analytics.repository.js';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly access: AccessService,
    private readonly analytics: AnalyticsRepository,
  ) {}

  async report(user: SessionUser, requested: ScopeRequest, from?: string, to?: string) {
    const scope = await this.access.resolveScope(user, requested);
    const period = createPeriod(from, to ?? (await this.analytics.latestDay(scope)) ?? undefined);
    const [timeseries, reviews] = await Promise.all([
      this.analytics.timeseries(scope, period),
      this.analytics.reviewStats(scope, period),
    ]);

    return { period, summary: summarize(timeseries, reviews), timeseries };
  }
}
