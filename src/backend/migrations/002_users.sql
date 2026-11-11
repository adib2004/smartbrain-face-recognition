CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  entries INTEGER NOT NULL DEFAULT 0 CHECK (entries >= 0),
  joined TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL
);
