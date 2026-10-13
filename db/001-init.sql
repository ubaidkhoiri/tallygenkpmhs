CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  form_id TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL,
  nama_pengirim TEXT NOT NULL DEFAULT '',
  desa_raw TEXT NOT NULL DEFAULT '',
  kelompok_raw TEXT NOT NULL DEFAULT '',
  desa_norm TEXT,
  kelompok_norm TEXT,
  data_mahasiswa TEXT NOT NULL DEFAULT '',
  confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  payload_hash TEXT NOT NULL,
  raw_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_submissions_kelompok ON submissions (kelompok_norm, submitted_at DESC);

CREATE TABLE IF NOT EXISTS group_pins (
  group_id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submissions (id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mod_overrides (
  group_id TEXT PRIMARY KEY,
  data_mahasiswa TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mod_audit (
  id BIGSERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  group_id TEXT,
  detail TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sync_state (
  id TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
