import { Injectable, NotFoundException } from '@nestjs/common';
import { SessionUser } from '../../identity/domain/session-user.js';
import { AccessService } from '../../tenancy/application/access.service.js';
import { ScopeRequest } from '../../tenancy/domain/scope.js';
import { ReviewFilter } from '../domain/review-filter.js';
import { ReviewStatus } from '../domain/review-status.js';
import { ReviewsRepository } from '../infrastructure/reviews.repository.js';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly access: AccessService,
    private readonly reviews: ReviewsRepository,
  ) {}

  async list(user: SessionUser, requested: ScopeRequest, filter: ReviewFilter) {
    const scope = await this.access.resolveScope(user, requested);
    return this.reviews.list(scope, filter);
  }

  async changeStatus(user: SessionUser, reviewId: number, status: ReviewStatus) {
    const scope = await this.access.resolveScope(user, {});
    const review = await this.reviews.updateStatus(reviewId, status, scope.companyId);
    if (!review) throw new NotFoundException('Отзыв не найден');
    return review;
  }
}
