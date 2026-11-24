-- the admin slice over all companies filters daily_metrics by date only, which the (branch_id, date) key cannot serve
CREATE INDEX daily_metrics_date_idx ON daily_metrics (date);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);
