import type { ReactNode } from 'react';
import { formatDate } from '@/shared/lib';
import { Panel } from '@/shared/ui/panel';
import type { Review } from '../model/review';
import './review-card.css';

const starPath = 'M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z';

export function ReviewCard({ review, actions }: { review: Review; actions?: ReactNode }) {
  return (
    <Panel as="li" className="review-card">
      <div className="review-card-head">
        <h2 className="review-card-author">{review.authorName}</h2>
        {actions}
      </div>
      <div className="review-card-meta">
        <span className="review-card-stars" role="img" aria-label={`Оценка ${review.rating} из 5`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <svg
              key={n}
              className={n <= review.rating ? undefined : 'review-card-star-off'}
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill={n <= review.rating ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            >
              <path d={starPath} />
            </svg>
          ))}
        </span>
        <span className="review-card-score">{review.rating} из 5</span>
        <span>
          {review.branchName} · {formatDate(review.publishedAt)}
        </span>
      </div>
      <p className="review-card-text">{review.text}</p>
    </Panel>
  );
}
