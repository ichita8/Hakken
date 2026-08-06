-- Add soft delete (archive) support to analyses table
-- Allows users to archive/delete analyses without permanently removing them

ALTER TABLE analyses
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Index for filtering out archived analyses efficiently
CREATE INDEX IF NOT EXISTS analyses_deleted_at_idx ON analyses(deleted_at);

-- Update the status check constraint to include 'archived'
ALTER TABLE analyses DROP CONSTRAINT IF EXISTS analyses_status_check;
ALTER TABLE analyses ADD CONSTRAINT analyses_status_check
  CHECK (status IN ('pending','analyzing','complete','failed','archived'));

COMMENT ON COLUMN analyses.deleted_at IS 'Soft delete timestamp. NULL = active, non-NULL = archived/deleted';
