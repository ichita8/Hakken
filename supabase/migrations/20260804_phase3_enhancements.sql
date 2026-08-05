-- Phase 3 Enhancement Migration: Enhanced AI Analysis, Trend Detection, Market Data

-- Add new columns to analyses table for Phase 3 features
ALTER TABLE analyses
ADD COLUMN IF NOT EXISTS trend_analysis JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS analysis_engine TEXT DEFAULT 'deterministic',
ADD COLUMN IF NOT EXISTS market_saturation NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS demand_trend TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS price_trajectory TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS historical_price_low NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS historical_price_high NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS historical_price_avg NUMERIC DEFAULT NULL;

-- Create marketplace_prices table for historical price tracking
CREATE TABLE IF NOT EXISTS marketplace_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_identifier TEXT NOT NULL, -- brand + model hash
  marketplace TEXT NOT NULL,
  price NUMERIC NOT NULL,
  condition TEXT,
  recorded_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for efficient price lookups
CREATE INDEX IF NOT EXISTS idx_marketplace_prices_product_marketplace 
ON marketplace_prices(product_identifier, marketplace, recorded_at DESC);

-- Create market_trends table for category-level trend analysis
CREATE TABLE IF NOT EXISTS market_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  trend_direction TEXT NOT NULL, -- 'up', 'down', 'stable'
  percent_change_90d NUMERIC,
  percent_change_1y NUMERIC,
  demand_trend TEXT,
  supply_trend TEXT,
  sell_through_rate NUMERIC,
  avg_days_to_sell NUMERIC,
  listing_velocity NUMERIC, -- listings per day
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for category lookups
CREATE INDEX IF NOT EXISTS idx_market_trends_category 
ON market_trends(category, last_updated DESC);

-- Create product_intelligence table for learned product data
CREATE TABLE IF NOT EXISTS product_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  category TEXT NOT NULL,
  avg_fair_market_value NUMERIC,
  price_range_low NUMERIC,
  price_range_high NUMERIC,
  typical_condition_score NUMERIC,
  authenticity_difficulty TEXT, -- 'easy', 'medium', 'hard'
  common_issues TEXT[],
  avg_days_to_sell NUMERIC,
  seasonality_factor NUMERIC, -- 1.0 = neutral, >1.0 = seasonal demand
  trend_direction TEXT,
  confidence NUMERIC,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for product lookups
CREATE INDEX IF NOT EXISTS idx_product_intelligence_brand_model 
ON product_intelligence(brand, model);

-- Create arbitrage_opportunities table (for Phase 4)
CREATE TABLE IF NOT EXISTS arbitrage_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE,
  source_marketplace TEXT NOT NULL,
  source_price NUMERIC NOT NULL,
  target_marketplace TEXT NOT NULL,
  target_price NUMERIC NOT NULL,
  profit_potential NUMERIC NOT NULL,
  roi_potential NUMERIC NOT NULL,
  confidence NUMERIC,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '7 days'
);

-- Create index for user arbitrage lookups
CREATE INDEX IF NOT EXISTS idx_arbitrage_opportunities_user_active 
ON arbitrage_opportunities(user_id, is_active, created_at DESC);

-- Create category_insights table for trend analysis
CREATE TABLE IF NOT EXISTS category_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  insight_type TEXT NOT NULL, -- 'emerging', 'declining', 'seasonal', 'stable'
  title TEXT NOT NULL,
  description TEXT,
  data JSONB,
  confidence NUMERIC,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '30 days'
);

-- Create index for category insights
CREATE INDEX IF NOT EXISTS idx_category_insights_category_type 
ON category_insights(category, insight_type, created_at DESC);

-- Enable RLS on new tables
ALTER TABLE marketplace_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE arbitrage_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for arbitrage_opportunities (user-scoped)
CREATE POLICY "Users can view their own arbitrage opportunities"
ON arbitrage_opportunities FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert arbitrage opportunities"
ON arbitrage_opportunities FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for marketplace_prices (public read, service role write)
CREATE POLICY "Anyone can view marketplace prices"
ON marketplace_prices FOR SELECT
USING (TRUE);

-- RLS Policies for market_trends (public read)
CREATE POLICY "Anyone can view market trends"
ON market_trends FOR SELECT
USING (TRUE);

-- RLS Policies for product_intelligence (public read)
CREATE POLICY "Anyone can view product intelligence"
ON product_intelligence FOR SELECT
USING (TRUE);

-- RLS Policies for category_insights (public read)
CREATE POLICY "Anyone can view category insights"
ON category_insights FOR SELECT
USING (TRUE);

-- Add comments for documentation
COMMENT ON TABLE marketplace_prices IS 'Historical price data from all marketplaces for trend analysis';
COMMENT ON TABLE market_trends IS 'Category-level market trends and demand signals';
COMMENT ON TABLE product_intelligence IS 'Learned product data: typical prices, condition, authenticity difficulty';
COMMENT ON TABLE arbitrage_opportunities IS 'Cross-marketplace arbitrage opportunities (Phase 4)';
COMMENT ON TABLE category_insights IS 'Emerging trends, seasonal patterns, and market insights';
