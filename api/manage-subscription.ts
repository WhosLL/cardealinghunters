import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { customerId } = req.body;
    if (!customerId) {
      return res.status(400).json({ error: 'Missing customerId' });
    }
    const origin = req.headers.origin || 'https://cardealinghunters.vercel.app';
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: origin + '/browse',
    });
    return res.status(200).json({ url: portalSession.url });
  } catch (error: any) {
    console.error('Portal error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create portal session' });
  }
}
