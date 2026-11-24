import { Module } from '@nestjs/common';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { IdentityModule } from './identity/identity.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { SharedModule } from './shared/shared.module.js';

@Module({
  imports: [SharedModule, IdentityModule, CatalogModule, AnalyticsModule, ReviewsModule],
})
export class AppModule {}
