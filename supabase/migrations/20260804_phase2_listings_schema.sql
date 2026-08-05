-- Phase 2: Marketplace Listings Schema
-- Creates the foundation for marketplace scraping and listing aggregation

CREATE TABLE IF NOT EXISTS listings_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace TEXT NOT NULL,
  marketplace_listing_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  seller_id TEXT,
  seller_name TEXT,
  images TEXT[],
  url TEXT NOT NULL,
  category TEXT,
  condition TEXT,
  location TEXT,
  shipping_cost NUMERIC DEFAULT 0,
  time_listed TIMESTAMP,
  quantity_available INTEGER DEFAULT 1,
  engagement_metrics JSONB,
  url_hash TEXT,
  scraped_at TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'pending', -- pending, analyzing, analyzed, archived
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(marketplace, marketplace_listing_id)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_listings_raw_marketplace 
ON listings_raw(marketplace, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listings_raw_status 
ON listings_raw(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listings_raw_category 
ON listings_raw(category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listings_raw_url_hash 
ON listings_raw(url_hash);

CREATE INDEX IF NOT EXISTS idx_listings_raw_price 
ON listings_raw(price);

CREATE INDEX IF NOT EXISTS idx_listings_raw_seller 
ON listings_raw(seller_id);

-- Enable RLS
ALTER TABLE listings_raw ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view listings (for analysis)
CREATE POLICY "Anyone can view listings"
ON listings_raw FOR SELECT
USING (TRUE);

-- Create listings_processed table for normalized data
CREATE TABLE IF NOT EXISTS listings_processed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listings_raw_id UUID NOT NULL REFERENCES listings_raw(id) ON DELETE CASCADE,
  marketplace TEXT NOT NULL,
  normalized_title TEXT NOT NULL,
  normalized_description TEXT,
  brand TEXT,
  model TEXT,
  category TEXT,
  condition TEXT,
  estimated_fmv NUMERIC,
  confidence NUMERIC,
  processed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for listings_processed
CREATE INDEX IF NOT EXISTS idx_listings_processed_raw_id 
ON listings_processed(listings_raw_id);

CREATE INDEX IF NOT EXISTS idx_listings_processed_brand_model 
ON listings_processed(brand, model);

CREATE INDEX IF NOT EXISTS idx_listings_processed_category 
ON listings_processed(category);

-- Enable RLS
ALTER TABLE listings_processed ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view processed listings
CREATE POLICY "Anyone can view processed listings"
ON listings_processed FOR SELECT
USING (TRUE);

-- Create scraping_jobs table for tracking scraping tasks
CREATE TABLE IF NOT EXISTS scraping_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace TEXT NOT NULL,
  category TEXT,
  keywords TEXT,
  status TEXT DEFAULT 'pending', -- pending, running, completed, failed
  listings_found INTEGER DEFAULT 0,
  listings_stored INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for scraping_jobs
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_marketplace_status 
ON scraping_jobs(marketplace, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scraping_jobs_completed_at 
ON scraping_jobs(completed_at DESC);

-- Enable RLS
ALTER TABLE scraping_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view scraping jobs
CREATE POLICY "Anyone can view scraping jobs"
ON scraping_jobs FOR SELECT
USING (TRUE);

-- Create marketplace_stats table for aggregated statistics
CREATE TABLE IF NOT EXISTS marketplace_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace TEXT NOT NULL,
  category TEXT,
  total_listings INTEGER DEFAULT 0,
  avg_price NUMERIC,
  median_price NUMERIC,
  price_range_low NUMERIC,
  price_range_high NUMERIC,
  avg_condition_score NUMERIC,
  avg_authenticity_confidence NUMERIC,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for marketplace_stats
CREATE INDEX IF NOT EXISTS idx_marketplace_stats_marketplace_category 
ON marketplace_stats(marketplace, category);

-- Enable RLS
ALTER TABLE marketplace_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view marketplace stats
CREATE POLICY "Anyone can view marketplace stats"
ON marketplace_stats FOR SELECT
USING (TRUE);

-- Add comments for documentation
COMMENT ON TABLE listings_raw IS 'Raw marketplace listings from scrapers (eBay, Mercari, Depop, etc.)';
COMMENT ON TABLE listings_processed IS 'Normalized and processed listings ready for analysis';
COMMENT ON TABLE scraping_jobs IS 'Tracking of marketplace scraping jobs and their results';
COMMENT ON TABLE marketplace_stats IS 'Aggregated statistics by marketplace and category';

COMMENT ON COLUMN listings_raw.status IS 'pending = not analyzed, analyzing = in progress, analyzed = complete, archived = old/sold';
COMMENT ON COLUMN listings_raw.engagement_metrics IS 'JSON: {views, watchers, bids, etc.}';
COMMENT ON COLUMN listings_processed.estimated_fmv IS 'Estimated fair market value from AI analysis';
