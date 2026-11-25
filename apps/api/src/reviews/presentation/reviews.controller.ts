import { BadRequestException, Body, Controller, Get, Param, ParseEnumPipe, Patch, Query } from '@nestjs/common';
import type { Review, ReviewPage, UpdateReviewStatusRequest } from 'contracts';
import { SessionUser } from '../../identity/domain/session-user.js';
import { CurrentUser } from '../../identity/presentation/current-user.decorator.js';
import { Period } from '../../shared/domain/period.js';
import {
  MAX_INT,
  ParseIdPipe,
  ParseIntRangePipe,
  ParsePeriodPipe,
  SingleValuePipe,
} from '../../shared/presentation/query.pipes.js';
import { ReviewsService } from '../application/reviews.service.js';
import { REVIEW_STATUS_ERROR, ReviewStatus } from '../domain/review-status.js';

const parseStatus = (optional: boolean) =>
  new ParseEnumPipe(ReviewStatus, { optional, exceptionFactory: () => new BadRequestException(REVIEW_STATUS_ERROR) });

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  list(
    @CurrentUser() user: SessionUser,
    @Query('companyId', ParseIdPipe) companyId: number | undefined,
    @Query('branchId', ParseIdPipe) branchId: number | undefined,
    @Query('rating', new ParseIntRangePipe(1, 5)) rating: number | undefined,
    @Query('status', SingleValuePipe, parseStatus(true)) status: ReviewStatus | undefined,
    @Query(new ParsePeriodPipe(true)) period: Period | null,
    @Query('limit', new ParseIntRangePipe(1, 100)) limit: number | undefined,
    @Query('offset', new ParseIntRangePipe(0, MAX_INT)) offset: number | undefined,
  ): Promise<ReviewPage> {
    return this.reviews.list(
      user,
      { companyId, branchId },
      { rating: rating ?? null, status: status ?? null, period, limit: limit ?? 20, offset: offset ?? 0 },
    );
  }

  @Patch(':id')
  updateStatus(
    @CurrentUser() user: SessionUser,
    @Param('id', ParseIdPipe) id: number,
    @Body('status', parseStatus(false)) status: UpdateReviewStatusRequest['status'],
  ): Promise<Review> {
    return this.reviews.changeStatus(user, id, status);
  }
}
