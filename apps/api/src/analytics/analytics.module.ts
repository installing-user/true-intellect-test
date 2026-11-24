import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { AnalyticsService } from './application/analytics.service.js';
import { AnalyticsRepository } from './infrastructure/analytics.repository.js';
import { AnalyticsController } from './presentation/analytics.controller.js';

@Module({
  imports: [TenancyModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsRepository],
})
export class AnalyticsModule {}
