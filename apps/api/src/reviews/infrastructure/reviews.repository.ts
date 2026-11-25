import { Injectable } from '@nestjs/common';
import type { Review, ReviewPage } from 'contracts';
import { DatabaseService } from '../../shared/infrastructure/database.service.js';
import { Scope } from '../../tenancy/domain/scope.js';
import { ReviewFilter } from '../domain/review-filter.js';
import { ReviewStatus } from '../domain/review-status.js';

const REVIEW_COLUMNS = `r.id, r.branch_id AS "branchId", b.name AS "branchName", r.author_name AS "authorName",
  r.rating, r.text, r.status, r.published_at AS "publishedAt"`;

type ReviewRow = Omit<Review, 'publishedAt'> & { publishedAt: Date };

const toReview = (row: ReviewRow): Review => ({ ...row, publishedAt: row.publishedAt.toISOString() });

@Injectable()
export class ReviewsRepository {
  constructor(private readonly database: DatabaseService) {}

  async list(scope: Scope, filter: ReviewFilter): Promise<ReviewPage> {
    const where = `FROM reviews r JOIN branches b ON b.id = r.branch_id
      WHERE ($1::int IS NULL OR b.company_id = $1)
        AND ($2::int IS NULL OR b.id = $2)
        AND ($3::int IS NULL OR r.rating = $3)
        AND ($4::text IS NULL OR r.status = $4)
        AND ($5::date IS NULL OR r.published_at >= $5::date::timestamp AT TIME ZONE 'UTC')
        AND ($6::date IS NULL OR r.published_at < ($6::date + 1)::timestamp AT TIME ZONE 'UTC')`;
    const params = [
      scope.companyId,
      scope.branchId,
      filter.rating,
      filter.status,
      filter.period?.from ?? null,
      filter.period?.to ?? null,
    ];

    const [items, [{ total }]] = await Promise.all([
      this.database.query<ReviewRow>(
        `SELECT ${REVIEW_COLUMNS} ${where} ORDER BY r.published_at DESC, r.id DESC LIMIT $7 OFFSET $8`,
        [...params, filter.limit, filter.offset],
      ),
      this.database.query<{ total: number }>(`SELECT count(*)::int AS total ${where}`, params),
    ]);

    return { items: items.map(toReview), total };
  }

  // scope check and write in one statement, so there is no gap between them
  async updateStatus(reviewId: number, status: ReviewStatus, companyId: number | null): Promise<Review | undefined> {
    const [review] = await this.database.query<ReviewRow>(
      `UPDATE reviews r SET status = $2 FROM branches b
       WHERE r.id = $1 AND b.id = r.branch_id AND ($3::int IS NULL OR b.company_id = $3)
       RETURNING ${REVIEW_COLUMNS}`,
      [reviewId, status, companyId],
    );

    return review && toReview(review);
  }
}
