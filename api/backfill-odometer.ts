// api/backfill-odometer.ts
// Fetches individual Craigslist listing pages to extract odometer/VIN/condition
// data that isn't available on search result pages.
// 
// Call: GET /api/backfill-odometer?batch=20&offset=0
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.

import { createClient } from '@supabase/supabase-js';

const ALLOWED_ORIGINS = [
  'https://cardealinghunters.vercel.app',
  'http://localhost:5173',
];

function setCorsHeaders(req: any, res: any) {
  const origin = req.headers?.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Parse the Craigslist detail page HTML to extract structured attributes
function parseListingPage(html: string): Record<string, string> {
  const attrs: Record<string, string> = {};

  // Match attribute divs: <div class="attr ..."><span class="labl">key:</span><span class="valu">value</span></div>
  const attrPattern = /<div[^>]*class="attr[^"]*"[^>]*>[\s\S]*?<span[^>]*class="labl"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<span[^>]*class="valu"[^>]*>([\s\S]*?)<\/span>/gi;
  let match;
  while ((match = attrPattern.exec(html)) !== null) {
    const key = match[1].replace(/<[^>]+>/g, '').replace(/:/g, '').trim().toLowerCase();
    const value = match[2].replace(/<[^>]+>/g, '').trim();
    if (key && value) {
      attrs[key] = value;
    }
  }

  // Also try to extract from JSON-LD on the detail page
  const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
  if (jsonLdMatch) {
    try {
      const ld = JSON.parse(jsonLdMatch[1]);
      if (ld.mileageFromOdometer) {
        const mileVal = ld.mileageFromOdometer.value || ld.mileageFromOdometer;
        if (mileVal) attrs['odometer_ld'] = String(mileVal);
      }
      if (ld.vehicleIdentificationNumber) {
        attrs['vin_ld'] = ld.vehicleIdentificationNumber;
      }
    } catch {}
  }

  return attrs;
}

function parseOdometer(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^0-9]/g, '');
  const val = parseInt(cleaned, 10);
  if (isNaN(val) || val < 100 || val > 900000) return 0;
  return val;
}

async function fetchWithRetry(url: string, retries = 2): Promise<string | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        },
        redirect: 'follow',
      });
      if (resp.status === 403 || resp.status === 429) {
        // Rate limited or blocked — wait and retry
        if (i < retries) {
          await new Promise(r => setTimeout(r, 2000 * (i + 1)));
          continue;
        }
        return null;
      }
      if (!resp.ok) return null;
      return await resp.text();
    } catch {
      if (i < retries) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      return null;
    }
  }
  return null;
}

export default async function handler(req: any, res: any) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Missing Supabase credentials' });
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  const batchSize = Math.min(parseInt(req.query.batch || '10', 10), 25);
  const offset = parseInt(req.query.offset || '0', 10);

  // Get listings that need odometer data
  const { data: listings, error: fetchErr } = await supabase
    .from('listings')
    .select('id, source_url, title, mileage')
    .eq('is_active', true)
    .eq('mileage', 0)
    .not('source_url', 'is', null)
    .like('source_url', '%craigslist.org%')
    .order('created_at', { ascending: false })
    .range(offset, offset + batchSize - 1);

  if (fetchErr) {
    return res.status(500).json({ error: fetchErr.message });
  }

  if (!listings || listings.length === 0) {
    return res.status(200).json({ message: 'No listings need odometer backfill', updated: 0, remaining: 0 });
  }

  // Count total remaining
  const { count: remaining } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('mileage', 0)
    .not('source_url', 'is', null)
    .like('source_url', '%craigslist.org%');

  const results: any[] = [];
  let updated = 0;
  let deleted = 0;
  let blocked = 0;
  let noOdometer = 0;

  for (const listing of listings) {
    // Add delay between requests to avoid rate limiting
    await new Promise(r => setTimeout(r, 800));

    const html = await fetchWithRetry(listing.source_url);
    
    if (!html) {
      blocked++;
      results.push({ id: listing.id, status: 'blocked/error' });
      continue;
    }

    // Check if listing was deleted
    if (html.includes('This posting has been deleted') || html.includes('This posting has expired')) {
      deleted++;
      results.push({ id: listing.id, status: 'deleted' });
      continue;
    }

    const attrs = parseListingPage(html);
    const odometer = parseOdometer(attrs['odometer'] || attrs['odometer_ld'] || '');
    const vin = attrs['vin'] || attrs['vin_ld'] || null;
    const condition = attrs['condition'] || null;
    const transmission = attrs['transmission'] || null;

    if (odometer > 0) {
      const updateData: any = { mileage: odometer };
      // We could store VIN/condition in description or new columns later
      
      const { error: updateErr } = await supabase
        .from('listings')
        .update(updateData)
        .eq('id', listing.id);

      if (!updateErr) {
        updated++;
        results.push({ id: listing.id, title: listing.title, status: 'updated', odometer, vin, condition, transmission });
      } else {
        results.push({ id: listing.id, status: 'update_error', error: updateErr.message });
      }
    } else {
      noOdometer++;
      results.push({ id: listing.id, status: 'no_odometer', attrs_found: Object.keys(attrs) });
    }
  }

  return res.status(200).json({
    processed: listings.length,
    updated,
    deleted,
    blocked,
    noOdometer,
    remaining: (remaining || 0) - updated,
    results,
  });
}
