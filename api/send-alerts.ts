import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function sendSMS(to: string, body: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !fromNumber) return null;
  const url = 'https://api.twilio.com/2010-04-01/Accounts/' + accountSid + '/Messages.json';
  const params = new URLSearchParams({ To: to, From: fromNumber, Body: body });
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(accountSid + ':' + authToken).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  return response.json();
}

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'alerts@cardealinghunters.com';
  if (!apiKey) return null;
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail, name: 'CarDealingHunters' },
      subject,
      content: [{ type: 'text/html', value: html }],
    }),
  });
  return { status: response.status };
}

function buildDealEmailHTML(deals: any[]) {
  const rows = deals.map(d => '<tr><td style="padding:12px"><strong>' + d.year + ' ' + d.make + ' ' + d.model + '</strong><br/><span style="color:#999">' + d.location + '</span></td><td style="padding:12px;color:#4ade80;font-weight:bold">$' + (d.price || 0).toLocaleString() + '</td><td style="padding:12px;color:#60a5fa">' + d.deal_score + '</td><td style="padding:12px"><a href="' + d.source_url + '" style="color:#a78bfa">View</a></td></tr>').join('');
  return '<div style="background:#111;color:#fff;padding:20px;font-family:sans-serif"><h2 style="color:#60a5fa">New Deals Found!</h2><p style="color:#999">CarDealingHunters found ' + deals.length + ' new deal(s) matching your preferences.</p><table style="width:100%;border-collapse:collapse;margin-top:16px"><thead><tr style="border-bottom:2px solid #444"><th style="padding:8px;text-align:left;color:#999">Vehicle</th><th style="padding:8px;text-align:left;color:#999">Price</th><th style="padding:8px;text-align:left;color:#999">Score</th><th style="padding:8px;text-align:left;color:#999">Link</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers['authorization'];
  const cronSecret = req.headers['x-vercel-cron'];
  if (!cronSecret && authHeader !== 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { data: proUsers } = await supabase
      .from('user_profiles')
      .select('user_id, full_name, subscription_tier')
      .in('subscription_tier', ['pro', 'dealer']);

    if (!proUsers || proUsers.length === 0) {
      return res.status(200).json({ message: 'No pro users to alert', sent: 0 });
    }

    let totalSMS = 0;
    let totalEmail = 0;

    for (const profile of proUsers) {
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
      if (!authUser?.user) continue;

      const email = authUser.user.email;
      const phone = authUser.user.phone;

      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', profile.user_id)
        .single();

      let query = supabase
        .from('listings')
        .select('*')
        .eq('is_active', true)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .in('deal_score', ['great', 'good'])
        .order('price', { ascending: true })
        .limit(10);

      if (prefs?.preferred_makes?.length > 0) query = query.in('make', prefs.preferred_makes);
      if (prefs?.preferred_price_max) query = query.lte('price', prefs.preferred_price_max);
      if (prefs?.preferred_price_min) query = query.gte('price', prefs.preferred_price_min);
      if (prefs?.preferred_mileage_max) query = query.lte('mileage', prefs.preferred_mileage_max);

      const { data: deals } = await query;
      if (!deals || deals.length === 0) continue;

      if (email) {
        const subject = deals.length + ' New Deal' + (deals.length > 1 ? 's' : '') + ' Found - CarDealingHunters';
        await sendEmail(email, subject, buildDealEmailHTML(deals));
        totalEmail++;
      }

      if (phone && profile.subscription_tier !== 'free') {
        const smsBody = deals.length === 1
          ? 'CDH Deal: ' + deals[0].year + ' ' + deals[0].make + ' ' + deals[0].model + ' $' + (deals[0].price || 0).toLocaleString() + ' (' + deals[0].deal_score + ') ' + deals[0].source_url
          : 'CDH: ' + deals.length + ' new deals! Best: ' + deals[0].year + ' ' + deals[0].make + ' ' + deals[0].model + ' $' + (deals[0].price || 0).toLocaleString() + '. Check cardealinghunters.vercel.app';
        await sendSMS(phone, smsBody);
        totalSMS++;
      }
    }

    return res.status(200).json({ message: 'Alerts sent', emailsSent: totalEmail, smsSent: totalSMS, usersProcessed: proUsers.length });
  } catch (error: any) {
    console.error('Alert error:', error);
    return res.status(500).json({ error: error.message });
  }
}
