# CarDealingHunters - New Features Setup Guide

## What was added
- Landing page (/) for non-logged-in visitors
- Pricing page (/pricing) with Free/Pro/Dealer tiers
- Stripe subscription checkout + webhook + billing portal
- Free tier daily usage limit (10 views/day)
- Upgrade banner when limit approached/reached
- Deal alert system (email via SendGrid + SMS via Twilio)
- Supabase migration for subscription columns

## Step 1: Run the Supabase Migration
Go to your Supabase dashboard > SQL Editor > paste contents of supabase-migration.sql > Run

## Step 2: Set up Stripe
1. Create account at stripe.com
2. Create a Product > "Pro Plan" > add Price: $49/month recurring
3. Copy the Price ID (starts with price_)
4. In Stripe Dashboard > Developers > API Keys, copy your Secret Key
5. Set up webhook: Developers > Webhooks > Add endpoint
   - URL: https://cardealinghunters.vercel.app/api/stripe-webhook
   - Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
   - Copy the Webhook Signing Secret

## Step 3: Add Vercel Environment Variables
Add these in Vercel > Settings > Environment Variables:
- STRIPE_SECRET_KEY=sk_live_xxx (or sk_test_xxx for testing)
- STRIPE_WEBHOOK_SECRET=whsec_xxx
- VITE_STRIPE_PRO_PRICE_ID=price_xxx

## Step 4 (Optional): Set up SendGrid for email alerts
1. Create account at sendgrid.com
2. Verify a sender email
3. Create API key
4. Add to Vercel: SENDGRID_API_KEY, SENDGRID_FROM_EMAIL

## Step 5 (Optional): Set up Twilio for SMS alerts
1. Create account at twilio.com
2. Get a phone number
3. Add to Vercel: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER

## New files added
- api/create-checkout.ts - Stripe checkout session creator
- api/stripe-webhook.ts - Stripe webhook handler
- api/manage-subscription.ts - Billing portal
- api/send-alerts.ts - Deal alert sender (email + SMS)
- src/pages/LandingPage.tsx - Marketing landing page
- src/pages/PricingPage.tsx - Pricing comparison page
- src/hooks/useSubscription.ts - Subscription state hook
- src/hooks/useUsageLimit.ts - Free tier limit tracker
- src/components/UpgradeBanner.tsx - Upgrade prompt banner
- supabase-migration.sql - Database migration
