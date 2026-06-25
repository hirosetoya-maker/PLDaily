-- NextAuth required tables
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  UNIQUE(provider, provider_account_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  expires TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT,
  token TEXT,
  expires TIMESTAMPTZ,
  PRIMARY KEY(identifier, token)
);

-- App tables
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS balance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  amount BIGINT NOT NULL,
  note TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  category_id UUID REFERENCES categories(id),
  date DATE NOT NULL,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL CHECK (type IN ('salary','bonus','side','other')),
  date DATE NOT NULL,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fixed_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  is_active BOOLEAN DEFAULT TRUE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monthly_fixed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fixed_expense_id UUID REFERENCES fixed_expenses(id) ON DELETE CASCADE NOT NULL,
  month DATE NOT NULL,
  amount BIGINT NOT NULL,
  payment_date DATE NOT NULL,
  is_paid BOOLEAN DEFAULT FALSE,
  UNIQUE(fixed_expense_id, month)
);

CREATE TABLE IF NOT EXISTS variable_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL,
  month DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS expenses_user_date ON expenses (user_id, date);
CREATE INDEX IF NOT EXISTS income_user_date ON income (user_id, date);
CREATE INDEX IF NOT EXISTS monthly_fixed_expense_month ON monthly_fixed (fixed_expense_id, month);
CREATE INDEX IF NOT EXISTS variable_expenses_user_month ON variable_expenses (user_id, month);
CREATE INDEX IF NOT EXISTS balance_logs_user_recorded ON balance_logs (user_id, recorded_at DESC);

-- Default categories (no user_id = system defaults)
INSERT INTO categories (id, user_id, name, icon, is_default, sort_order)
VALUES
  (gen_random_uuid(), NULL, '食費', '🍜', true, 1),
  (gen_random_uuid(), NULL, '交通費', '🚃', true, 2),
  (gen_random_uuid(), NULL, '娯楽', '🎮', true, 3),
  (gen_random_uuid(), NULL, '日用品', '🛒', true, 4),
  (gen_random_uuid(), NULL, '医療', '🏥', true, 5),
  (gen_random_uuid(), NULL, '通信', '📱', true, 6),
  (gen_random_uuid(), NULL, '被服', '👕', true, 7),
  (gen_random_uuid(), NULL, '光熱費', '💡', true, 8)
ON CONFLICT DO NOTHING;
