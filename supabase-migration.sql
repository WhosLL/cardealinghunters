-- Migration: Add subscription fields to user_profiles
-- Run this in your Supabase SQL Editor

-- Add subscription columns to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'dealer')),
ADD COLUMN IF NOT EXISTS subscription_status TEXT CHECK (subscription_status IN ('active', 'canceled', 'past_due') OR subscription_status IS NULL),
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Create index for Stripe webhook lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer_id
ON user_profiles(stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;

-- Create alert_preferences table for granular alert settings
CREATE TABLE IF NOT EXISTS alert_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email_alerts BOOLEAN DEFAULT true,
  sms_alerts BOOLEAN DEFAULT false,
  phone_number TEXT,
  alert_frequency TEXT DEFAULT 'realtime' CHECK (alert_frequency IN ('realtime', 'hourly', 'daily')),
  min_deal_score TEXT DEFAULT 'good' CHECK (min_deal_score IN ('great', 'good', 'fair')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for alert_preferences
ALTER TABLE alert_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own alert prefs" ON alert_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own alert prefs" ON alert_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alert prefs" ON alert_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can read all (for send-alerts endpoint)
CREATE POLICY "Service role can read all alert prefs" ON alert_preferences
  FOR SELECT USING (auth.role() = 'service_role');
