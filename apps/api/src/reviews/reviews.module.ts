import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { ReviewsService } from './application/reviews.service.js';
import { ReviewsRepository } from './infrastructure/reviews.repository.js';
import { ReviewsController } from './presentation/reviews.controller.js';

@Module({
  imports: [TenancyModule],
  controllers: [ReviewsController],
  providers: [ReviewsService, ReviewsRepository],
})
export class ReviewsModule {}
