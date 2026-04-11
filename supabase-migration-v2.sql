-- CarDealingHunters v2 Migration: Saved Searches & Enhanced Features
-- Run this in Supabase SQL Editor after the initial migration

-- Saved Searches table
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  alerts_enabled BOOLEAN NOT NULL DEFAULT true,
  alert_method TEXT NOT NULL DEFAULT 'email' CHECK (alert_method IN ('email', 'sms', 'both')),
  last_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);

-- RLS for saved_searches
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved searches"
  ON saved_searches FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create saved searches"
  ON saved_searches FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved searches"
  ON saved_searches FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved searches"
  ON saved_searches FOR DELETE USING (auth.uid() = user_id);

-- Add VIN column to listings if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listings' AND column_name = 'vin') THEN
    ALTER TABLE listings ADD COLUMN vin TEXT;
  END IF;
END $$;

-- Add exterior_color and transmission to listings
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listings' AND column_name = 'exterior_color') THEN
    ALTER TABLE listings ADD COLUMN exterior_color TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listings' AND column_name = 'transmission') THEN
    ALTER TABLE listings ADD COLUMN transmission TEXT;
  END IF;
END $$;

-- Listing views tracking (for analytics)
CREATE TABLE IF NOT EXISTS listing_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_views_listing ON listing_views(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_views_user ON listing_views(user_id);

ALTER TABLE listing_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert views"
  ON listing_views FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own views"
  ON listing_views FOR SELECT USING (auth.uid() = user_id);
