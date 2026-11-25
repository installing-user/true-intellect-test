-- the admin slice over all companies summed 1.8M daily_metrics rows per request at 5 000 branches; per-company daily totals cut that tenfold
CREATE TABLE company_daily_metrics (
  company_id int NOT NULL REFERENCES companies(id),
  date date NOT NULL,
  views bigint NOT NULL DEFAULT 0,
  site_clicks bigint NOT NULL DEFAULT 0,
  calls bigint NOT NULL DEFAULT 0,
  routes bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (company_id, date)
);

CREATE INDEX company_daily_metrics_date_idx ON company_daily_metrics (date);

INSERT INTO company_daily_metrics (company_id, date, views, site_clicks, calls, routes)
SELECT b.company_id, m.date, sum(m.views), sum(m.site_clicks), sum(m.calls), sum(m.routes)
FROM daily_metrics m
JOIN branches b ON b.id = m.branch_id
GROUP BY b.company_id, m.date;

-- statement-level with transition tables: a bulk load of N rows costs one aggregate upsert, not N
CREATE FUNCTION apply_daily_metrics_to_company_totals() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    INSERT INTO company_daily_metrics AS totals (company_id, date, views, site_clicks, calls, routes)
    SELECT b.company_id, rows.date, sum(rows.views), sum(rows.site_clicks), sum(rows.calls), sum(rows.routes)
    FROM new_rows rows
    JOIN branches b ON b.id = rows.branch_id
    GROUP BY b.company_id, rows.date
    ON CONFLICT (company_id, date) DO UPDATE SET
      views = totals.views + EXCLUDED.views,
      site_clicks = totals.site_clicks + EXCLUDED.site_clicks,
      calls = totals.calls + EXCLUDED.calls,
      routes = totals.routes + EXCLUDED.routes;
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    UPDATE company_daily_metrics totals SET
      views = totals.views - removed.views,
      site_clicks = totals.site_clicks - removed.site_clicks,
      calls = totals.calls - removed.calls,
      routes = totals.routes - removed.routes
    FROM (
      SELECT b.company_id, rows.date, sum(rows.views) AS views, sum(rows.site_clicks) AS site_clicks,
             sum(rows.calls) AS calls, sum(rows.routes) AS routes
      FROM old_rows rows
      JOIN branches b ON b.id = rows.branch_id
      GROUP BY b.company_id, rows.date
    ) removed
    WHERE totals.company_id = removed.company_id AND totals.date = removed.date;

    -- a zero row would still count as a day with data for the default period
    DELETE FROM company_daily_metrics totals
    USING (SELECT DISTINCT b.company_id, rows.date FROM old_rows rows JOIN branches b ON b.id = rows.branch_id) touched
    WHERE totals.company_id = touched.company_id AND totals.date = touched.date
      AND NOT EXISTS (
        SELECT 1 FROM daily_metrics m JOIN branches b ON b.id = m.branch_id
        WHERE b.company_id = touched.company_id AND m.date = touched.date
      );
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER daily_metrics_totals_insert AFTER INSERT ON daily_metrics
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION apply_daily_metrics_to_company_totals();

CREATE TRIGGER daily_metrics_totals_update AFTER UPDATE ON daily_metrics
  REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION apply_daily_metrics_to_company_totals();

CREATE TRIGGER daily_metrics_totals_delete AFTER DELETE ON daily_metrics
  REFERENCING OLD TABLE AS old_rows
  FOR EACH STATEMENT EXECUTE FUNCTION apply_daily_metrics_to_company_totals();
