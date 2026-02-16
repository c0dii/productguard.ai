-- ============================================================================
-- ProductGuard.ai - Initial Database Schema
-- Run this SQL in your Supabase SQL Editor
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE plan_tier AS ENUM ('scout', 'starter', 'pro', 'business');
CREATE TYPE product_type AS ENUM ('course', 'indicator', 'software', 'template', 'ebook', 'other');
CREATE TYPE scan_status AS ENUM ('pending', 'running', 'completed', 'failed');
CREATE TYPE risk_level AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE platform_type AS ENUM ('telegram', 'google', 'cyberlocker', 'torrent', 'discord', 'forum', 'social');
CREATE TYPE infringement_type AS ENUM ('channel', 'group', 'bot', 'indexed_page', 'direct_download', 'torrent', 'server', 'post');
CREATE TYPE infringement_status AS ENUM ('active', 'takedown_sent', 'removed', 'disputed');
CREATE TYPE takedown_type AS ENUM ('dmca', 'cease_desist', 'google_deindex');
CREATE TYPE takedown_status AS ENUM ('draft', 'sent', 'acknowledged', 'removed', 'failed');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'unpaid');

-- ============================================================================
-- TABLES
-- ============================================================================

-- Profiles (extends Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  company_name TEXT,
  plan_tier plan_tier DEFAULT 'scout' NOT NULL,
  stripe_customer_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT,
  price NUMERIC(10, 2) NOT NULL,
  type product_type NOT NULL,
  keywords TEXT[],
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Scans
CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status scan_status DEFAULT 'pending' NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  infringement_count INTEGER DEFAULT 0 NOT NULL,
  est_revenue_loss NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Infringements
CREATE TABLE infringements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  platform platform_type NOT NULL,
  source_url TEXT NOT NULL,
  risk_level risk_level NOT NULL,
  type infringement_type NOT NULL,
  audience_size TEXT,
  est_revenue_loss NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  status infringement_status DEFAULT 'active' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Takedowns
CREATE TABLE takedowns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  infringement_id UUID NOT NULL REFERENCES infringements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type takedown_type NOT NULL,
  status takedown_status DEFAULT 'draft' NOT NULL,
  sent_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  recipient_email TEXT,
  notice_content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  plan_tier plan_tier NOT NULL,
  status subscription_status NOT NULL,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Scan Schedules
CREATE TABLE scan_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE infringements ENABLE ROW LEVEL SECURITY;
ALTER TABLE takedowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_schedules ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Products RLS Policies
CREATE POLICY "Users can view own products" ON products
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own products" ON products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products" ON products
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own products" ON products
  FOR DELETE USING (auth.uid() = user_id);

-- Scans RLS Policies
CREATE POLICY "Users can view own scans" ON scans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scans" ON scans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scans" ON scans
  FOR UPDATE USING (auth.uid() = user_id);

-- Infringements RLS Policies
CREATE POLICY "Users can view own infringements" ON infringements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = infringements.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own infringements" ON infringements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = infringements.product_id
      AND products.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own infringements" ON infringements
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = infringements.product_id
      AND products.user_id = auth.uid()
    )
  );

-- Takedowns RLS Policies
CREATE POLICY "Users can view own takedowns" ON takedowns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own takedowns" ON takedowns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own takedowns" ON takedowns
  FOR UPDATE USING (auth.uid() = user_id);

-- Subscriptions RLS Policies
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Scan Schedules RLS Policies
CREATE POLICY "Users can view own schedules" ON scan_schedules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own schedules" ON scan_schedules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedules" ON scan_schedules
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedules" ON scan_schedules
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_takedowns_updated_at BEFORE UPDATE ON takedowns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scan_schedules_updated_at BEFORE UPDATE ON scan_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Dashboard stats view
CREATE VIEW user_dashboard_stats AS
SELECT
  p.id AS user_id,
  COUNT(DISTINCT pr.id) AS total_products,
  COUNT(DISTINCT s.id) AS total_scans,
  COUNT(DISTINCT i.id) AS total_infringements,
  COUNT(DISTINCT t.id) AS total_takedowns,
  COALESCE(SUM(i.est_revenue_loss), 0) AS total_est_loss
FROM profiles p
LEFT JOIN products pr ON pr.user_id = p.id
LEFT JOIN scans s ON s.user_id = p.id
LEFT JOIN infringements i ON i.product_id = pr.id
LEFT JOIN takedowns t ON t.user_id = p.id
GROUP BY p.id;

-- ============================================================================
-- INDEXES (for performance)
-- ============================================================================

CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_scans_user_id ON scans(user_id);
CREATE INDEX idx_scans_product_id ON scans(product_id);
CREATE INDEX idx_scans_status ON scans(status);
CREATE INDEX idx_infringements_scan_id ON infringements(scan_id);
CREATE INDEX idx_infringements_product_id ON infringements(product_id);
CREATE INDEX idx_infringements_status ON infringements(status);
CREATE INDEX idx_takedowns_user_id ON takedowns(user_id);
CREATE INDEX idx_takedowns_infringement_id ON takedowns(infringement_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_scan_schedules_user_id ON scan_schedules(user_id);
CREATE INDEX idx_scan_schedules_next_run ON scan_schedules(next_run_at) WHERE is_active = TRUE;

-- ============================================================================
-- GRANTS (ensure proper permissions)
-- ============================================================================

-- Grant access to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- DONE!
-- ============================================================================
-- Your ProductGuard.ai database is ready!
-- Next steps:
-- 1. Create .env.local with your Supabase credentials
-- 2. Run npm install
-- 3. Run npm run dev
-- ============================================================================
