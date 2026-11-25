'use client';

import type { UpdateReviewStatusRequest } from 'contracts';
import { useEffect, useState } from 'react';
import { type Review, type ReviewStatus, statusIcon, statusLabel } from '@/entities/review';
import { ApiError, apiFetch } from '@/shared/api';
import { Icon, Spinner } from '@/shared/ui/icon';
import { Select } from '@/shared/ui/select';
import './review-status.css';

export function ReviewStatusSelect({ review }: { review: Review }) {
  const [status, setStatus] = useState(review.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 1200);

    return () => clearTimeout(timer);
  }, [saved]);

  async function change(next: ReviewStatus) {
    const previous = status;

    setStatus(next);
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const updated = await apiFetch<Review>(`/api/reviews/${review.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next } satisfies UpdateReviewStatusRequest),
      });

      setStatus(updated.status);
      setSaved(true);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.assign('/login');

        return;
      }

      setStatus(previous);
      setError('Не удалось сохранить статус');
      setShake(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="review-status" onAnimationEnd={(event) => event.animationName === 'shake' && setShake(false)}>
      {saving && (
        <span className="review-saving" aria-live="polite">
          <Spinner size={16} />
          Сохраняем…
        </span>
      )}
      {saved && (
        <span className="review-saved" role="status">
          <Icon name="check" size={16} />
          Сохранено
        </span>
      )}
      {error && (
        <span className="review-error" role="alert">
          <Icon name="alert" size={16} />
          {error}
        </span>
      )}
      <Select
        variant="pill"
        className={`review-badge-${status}${saved ? ' review-flash' : ''}${shake ? ' shake' : ''}`}
        aria-label="Статус отзыва"
        value={status}
        disabled={saving}
        onChange={(value) => change(value as ReviewStatus)}
        options={(Object.keys(statusLabel) as ReviewStatus[]).map((status) => ({
          value: status,
          label: statusLabel[status],
          icon: statusIcon[status],
        }))}
      />
    </div>
  );
}
