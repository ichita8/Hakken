/*
# HAKKEN Phase 1 Schema

## Overview
Creates the full database schema for the HAKKEN AI-Powered Resale Intelligence Platform (Phase 1).
All tables are multi-user, owner-scoped with RLS.

## Tables

### profiles
Stores user preferences, resale profile settings, and budget configuration.
- id: links to auth.users
- display_name, avatar_url: profile display
- budget: capital allocation for deals
- risk_tolerance: conservative / moderate / aggressive
- preferred_categories: JSONB array of category strings
- preferred_marketplaces: JSONB array
- target_roi_min: minimum acceptable ROI %
- target_days_to_sell_max: maximum acceptable days to sell
- created_at, updated_at

### analyses
Stores every AI analysis report run on a listing.
- id: primary key
- user_id: owner (defaults to auth.uid())
- title, description, asking_price, marketplace: raw listing data
- image_urls: JSONB array of listing image URLs
- listing_url: optional original URL
- item_brand, item_model, item_year, item_color, item_condition: identified product details
- identification_confidence: % confidence in product ID
- identification_reasoning: text explanation
- condition_scores: JSONB (exterior, glass, buttons, packaging, accessories)
- condition_risk_score: 0-100 overall condition risk
- authenticity_verdict: boolean + confidence
- fair_market_value, resale_low, resale_high, fast_sale_price: price points
- max_acquisition_price: maximum to pay
- expected_profit, expected_roi, expected_days_to_sell: projections
- valuation_confidence: High / Medium / Low
- opportunity_score: 0-100
- opportunity_tier: Exceptional / Strong / Interesting / Weak / Avoid
- decision: BUY / NEGOTIATE / WATCH / AVOID
- fraud_risk_score: 0-100
- fraud_primary_concern, fraud_secondary_concern: text flags
- comps: JSONB array of comparable sold listings
- inspection_checklist: JSONB array of checklist items
- negotiation_recommended_offer, negotiation_probability, negotiation_message: negotiation data
- layer_results: JSONB with the 5-layer pipeline results
- status: pending / analyzing / complete / failed
- created_at

### portfolio_items
Tracks inventory the user has purchased, is selling, or has sold.
- id: primary key
- user_id: owner
- analysis_id: links back to original analysis (nullable if manually added)
- title, marketplace_bought, marketplace_selling: item details
- acquisition_price: what user paid
- listing_price: current asking price
- sold_price: final sale price (null if unsold)
- sold_date: date sold
- fees_paid, shipping_paid: actual costs
- actual_profit, actual_roi: realized returns
- status: active / listed / sold
- listing_title, listing_description, best_marketplace: AI-generated listing help
- photography_checklist, shipping_recommendation: JSONB seller guidance
- notes: freeform user notes
- created_at, updated_at

### deal_alerts
Saved high-score opportunity alerts surfaced to the user.
- id: primary key
- user_id: owner
- analysis_id: links to the analysis
- title, marketplace, asking_price, opportunity_score, expected_profit: summary data
- is_read: boolean
- created_at

## Security
- RLS enabled on all tables
- All policies scoped to authenticated users owning their own rows
- user_id defaults to auth.uid() on insert
*/

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  budget numeric(12,2) DEFAULT 500,
  risk_tolerance text NOT NULL DEFAULT 'moderate' CHECK (risk_tolerance IN ('conservative','moderate','aggressive')),
  preferred_categories jsonb NOT NULL DEFAULT '[]',
  preferred_marketplaces jsonb NOT NULL DEFAULT '[]',
  target_roi_min numeric(5,2) DEFAULT 20,
  target_days_to_sell_max integer DEFAULT 30,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- ANALYSES
CREATE TABLE IF NOT EXISTS analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Raw listing input
  title text NOT NULL,
  description text,
  asking_price numeric(12,2) NOT NULL,
  marketplace text NOT NULL,
  image_urls jsonb NOT NULL DEFAULT '[]',
  listing_url text,
  -- Product identification
  item_brand text,
  item_model text,
  item_year text,
  item_color text,
  item_variant text,
  item_condition text,
  item_accessories text,
  identification_confidence integer,
  identification_reasoning text,
  -- Condition assessment
  condition_scores jsonb,
  condition_risk_score integer,
  authenticity_verdict boolean,
  authenticity_confidence integer,
  -- Valuation
  fair_market_value numeric(12,2),
  resale_low numeric(12,2),
  resale_high numeric(12,2),
  fast_sale_price numeric(12,2),
  max_acquisition_price numeric(12,2),
  expected_profit numeric(12,2),
  expected_roi numeric(7,2),
  expected_days_to_sell_low integer,
  expected_days_to_sell_high integer,
  valuation_confidence text CHECK (valuation_confidence IN ('High','Medium','Low')),
  -- Opportunity
  opportunity_score integer,
  opportunity_tier text,
  decision text CHECK (decision IN ('BUY','NEGOTIATE','WATCH','AVOID')),
  -- Fraud
  fraud_risk_score integer,
  fraud_primary_concern text,
  fraud_secondary_concern text,
  -- Supporting data
  comps jsonb DEFAULT '[]',
  inspection_checklist jsonb DEFAULT '[]',
  -- Negotiation
  negotiation_recommended_offer numeric(12,2),
  negotiation_probability integer,
  negotiation_message text,
  negotiation_walk_away_price numeric(12,2),
  -- Pipeline
  layer_results jsonb DEFAULT '{}',
  -- Status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','analyzing','complete','failed')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analyses_user_id_idx ON analyses(user_id);
CREATE INDEX IF NOT EXISTS analyses_created_at_idx ON analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS analyses_status_idx ON analyses(status);

ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_analyses" ON analyses;
CREATE POLICY "select_own_analyses" ON analyses FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_analyses" ON analyses;
CREATE POLICY "insert_own_analyses" ON analyses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_analyses" ON analyses;
CREATE POLICY "update_own_analyses" ON analyses FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_analyses" ON analyses;
CREATE POLICY "delete_own_analyses" ON analyses FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- PORTFOLIO_ITEMS
CREATE TABLE IF NOT EXISTS portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id uuid REFERENCES analyses(id) ON DELETE SET NULL,
  title text NOT NULL,
  category text,
  marketplace_bought text,
  marketplace_selling text,
  acquisition_price numeric(12,2) NOT NULL,
  listing_price numeric(12,2),
  sold_price numeric(12,2),
  sold_date date,
  fees_paid numeric(12,2),
  shipping_paid numeric(12,2),
  actual_profit numeric(12,2),
  actual_roi numeric(7,2),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','listed','sold')),
  listing_title text,
  listing_description text,
  best_marketplace text,
  photography_checklist jsonb DEFAULT '[]',
  shipping_recommendation text,
  expected_sale_days_low integer,
  expected_sale_days_high integer,
  notes text,
  image_urls jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portfolio_user_id_idx ON portfolio_items(user_id);
CREATE INDEX IF NOT EXISTS portfolio_status_idx ON portfolio_items(status);

ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_portfolio" ON portfolio_items;
CREATE POLICY "select_own_portfolio" ON portfolio_items FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_portfolio" ON portfolio_items;
CREATE POLICY "insert_own_portfolio" ON portfolio_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_portfolio" ON portfolio_items;
CREATE POLICY "update_own_portfolio" ON portfolio_items FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_portfolio" ON portfolio_items;
CREATE POLICY "delete_own_portfolio" ON portfolio_items FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- DEAL_ALERTS
CREATE TABLE IF NOT EXISTS deal_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id uuid REFERENCES analyses(id) ON DELETE CASCADE,
  title text NOT NULL,
  marketplace text,
  asking_price numeric(12,2),
  opportunity_score integer,
  expected_profit numeric(12,2),
  decision text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS alerts_user_id_idx ON deal_alerts(user_id);
CREATE INDEX IF NOT EXISTS alerts_is_read_idx ON deal_alerts(is_read);

ALTER TABLE deal_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_alerts" ON deal_alerts;
CREATE POLICY "select_own_alerts" ON deal_alerts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_alerts" ON deal_alerts;
CREATE POLICY "insert_own_alerts" ON deal_alerts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_alerts" ON deal_alerts;
CREATE POLICY "update_own_alerts" ON deal_alerts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_alerts" ON deal_alerts;
CREATE POLICY "delete_own_alerts" ON deal_alerts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
