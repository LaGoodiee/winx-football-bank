-- Winx Football Bank: Phase 1 schema
-- Money is stored in kobo (integer) to avoid rounding errors.

CREATE TABLE users (
  id              TEXT PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  phone           TEXT,
  role            TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','reviewer','admin')),
  email_verified  INTEGER NOT NULL DEFAULT 0,
  created_at      INTEGER NOT NULL
);

CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,          -- sha256 of the cookie token
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mfa_passed  INTEGER NOT NULL DEFAULT 0,
  expires_at  INTEGER NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

CREATE TABLE trusted_devices (
  id          TEXT PRIMARY KEY,          -- sha256 of the device cookie token
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  INTEGER NOT NULL
);

CREATE TABLE otp_codes (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose     TEXT NOT NULL CHECK (purpose IN ('verify_email','login','reset_password')),
  code_hash   TEXT NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  used        INTEGER NOT NULL DEFAULT 0,
  expires_at  INTEGER NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_otp_user ON otp_codes(user_id, purpose);

CREATE TABLE login_attempts (
  email       TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_login_attempts ON login_attempts(email, created_at);

-- A profile is the banking customer: a player, a club or an academy.
CREATE TABLE profiles (
  id                      TEXT PRIMARY KEY,
  type                    TEXT NOT NULL CHECK (type IN ('player','club','academy')),
  name                    TEXT NOT NULL,
  address                 TEXT,
  phone                   TEXT,
  status                  TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
  bvn_status              TEXT NOT NULL DEFAULT 'none' CHECK (bvn_status IN ('none','pending','verified','failed')),
  bvn_last4               TEXT,
  bvn_failure_reason      TEXT,
  paystack_customer_code  TEXT,
  created_by              TEXT NOT NULL REFERENCES users(id),
  created_at              INTEGER NOT NULL
);

-- People who can act for a profile. Pending invites have user_id NULL until the invitee signs up.
CREATE TABLE memberships (
  profile_id  TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active')),
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (profile_id, email)
);
CREATE INDEX idx_memberships_user ON memberships(user_id);

CREATE TABLE applications (
  id            TEXT PRIMARY KEY,
  reference     TEXT NOT NULL UNIQUE,
  profile_id    TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('account','loan','grant')),
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','changes_requested','submitted','verification','assessment','approved','rejected')),
  data          TEXT NOT NULL DEFAULT '{}',   -- JSON form fields
  amount_kobo   INTEGER,
  reviewer_note TEXT,
  created_by    TEXT NOT NULL REFERENCES users(id),
  submitted_at  INTEGER,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
CREATE INDEX idx_applications_profile ON applications(profile_id);
CREATE INDEX idx_applications_status ON applications(status);

CREATE TABLE documents (
  id              TEXT PRIMARY KEY,
  application_id  TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  slot            TEXT NOT NULL,           -- e.g. passport_photo, identification, credentials
  r2_key          TEXT NOT NULL,
  filename        TEXT NOT NULL,
  content_type    TEXT NOT NULL,
  size            INTEGER NOT NULL,
  uploaded_by     TEXT NOT NULL REFERENCES users(id),
  created_at      INTEGER NOT NULL
);
CREATE INDEX idx_documents_app ON documents(application_id);

CREATE TABLE status_history (
  id              TEXT PRIMARY KEY,
  application_id  TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_status     TEXT,
  to_status       TEXT NOT NULL,
  note            TEXT,
  changed_by      TEXT REFERENCES users(id),
  created_at      INTEGER NOT NULL
);
CREATE INDEX idx_history_app ON status_history(application_id);

CREATE TABLE notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  link        TEXT,
  read_at     INTEGER,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at);

CREATE TABLE savings_goals (
  id              TEXT PRIMARY KEY,
  profile_id      TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  plan_type       TEXT NOT NULL CHECK (plan_type IN ('flexible','fixed')),
  target_kobo     INTEGER NOT NULL,
  saved_kobo      INTEGER NOT NULL DEFAULT 0,  -- tracked by the customer in Phase 1; real balance in Phase 2
  interest_rate   REAL NOT NULL,
  duration_days   INTEGER NOT NULL,
  start_date      INTEGER NOT NULL,
  created_by      TEXT NOT NULL REFERENCES users(id),
  created_at      INTEGER NOT NULL
);
CREATE INDEX idx_savings_profile ON savings_goals(profile_id);

-- Editable business rules (JSON values), managed from /admin/settings.
CREATE TABLE settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_by  TEXT REFERENCES users(id),
  updated_at  INTEGER NOT NULL
);

CREATE TABLE contact_messages (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  message     TEXT NOT NULL,
  handled     INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);
