-- Enhance listings_raw for real eBay integration
-- Adds currency column and analysis link

ALTER TABLE listings_raw
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS analysis_id UUID REFERENCES analyses(id) ON DELETE SET NULL;

-- Index for finding listings linked to an analysis
CREATE INDEX IF NOT EXISTS idx_listings_raw_analysis_id
ON listings_raw(analysis_id) WHERE analysis_id IS NOT NULL;

-- Update status constraint to include 'analyzing' and 'analyzed'
ALTER TABLE listings_raw DROP CONSTRAINT IF EXISTS listings_raw_status_check;
ALTER TABLE listings_raw ADD CONSTRAINT listings_raw_status_check
  CHECK (status IN ('pending', 'analyzing', 'analyzed', 'archived'));

COMMENT ON COLUMN listings_raw.currency IS 'Currency code for the listing price (USD, EUR, etc.)';
COMMENT ON COLUMN listings_raw.analysis_id IS 'Links to the auto-generated analysis for this listing';
