import { Controller, Get, Query } from '@nestjs/common';
import type { AnalyticsReport } from 'contracts';
import { SessionUser } from 'contracts';
import { CurrentUser } from '../../identity/presentation/current-user.decorator.js';
import { ParseIdPipe, SingleValuePipe } from '../../shared/presentation/query.pipes.js';
import { AnalyticsService } from '../application/analytics.service.js';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get()
  get(
    @CurrentUser() user: SessionUser,
    @Query('companyId', ParseIdPipe) companyId: number | undefined,
    @Query('branchId', ParseIdPipe) branchId: number | undefined,
    @Query('from', SingleValuePipe) from: string | undefined,
    @Query('to', SingleValuePipe) to: string | undefined,
  ): Promise<AnalyticsReport> {
    return this.analytics.report(user, { companyId, branchId }, from, to);
  }
}
