CREATE TABLE companies (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE branches (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id int NOT NULL REFERENCES companies(id),
  name text NOT NULL,
  address text NOT NULL
);
CREATE INDEX branches_company_id_idx ON branches (company_id);

CREATE TABLE users (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'client')),
  company_id int REFERENCES companies(id),
  -- a client without company would pass the scope check as admin
  CHECK ((role = 'admin') = (company_id IS NULL))
);

CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);

CREATE TABLE daily_metrics (
  branch_id int NOT NULL REFERENCES branches(id),
  date date NOT NULL,
  views int NOT NULL DEFAULT 0 CHECK (views >= 0),
  site_clicks int NOT NULL DEFAULT 0 CHECK (site_clicks >= 0),
  calls int NOT NULL DEFAULT 0 CHECK (calls >= 0),
  routes int NOT NULL DEFAULT 0 CHECK (routes >= 0),
  PRIMARY KEY (branch_id, date)
);

CREATE TABLE reviews (
  id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  branch_id int NOT NULL REFERENCES branches(id),
  author_name text NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'done')),
  published_at timestamptz NOT NULL
);
CREATE INDEX reviews_branch_id_published_at_idx ON reviews (branch_id, published_at);
