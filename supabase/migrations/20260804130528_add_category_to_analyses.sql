/*
# Add category column to analyses table

1. Changes
- Adds a `category` text column to the `analyses` table so users can specify
  a category when submitting a listing for analysis (e.g. "Technology",
  "Automobiles", or any custom category beyond the preset list).
- The column is nullable so existing analyses are unaffected.
- No RLS changes needed — existing policies already cover the new column
  since RLS operates at the row level, not column level.

2. Notes
- This enables the frontend to send a user-selected category hint to the
  edge function, which can use it to improve analysis accuracy.
- Existing rows will have NULL for category, which the UI handles gracefully.
*/

ALTER TABLE analyses ADD COLUMN IF NOT EXISTS category text;
