CREATE TABLE IF NOT EXISTS deleted_submissions (
  submission_id text PRIMARY KEY,
  deleted_at timestamptz NOT NULL DEFAULT now()
);
