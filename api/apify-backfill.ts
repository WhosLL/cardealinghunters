// api/apify-backfill.ts
// Uses Apify residential proxies to fetch Craigslist listing detail pages
// and extract odometer/VIN/condition data.
//
// GET /api/apify-backfill?batch=20&offset=0
//
// Requires env vars: APIFY_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

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

function parseListingPage(html: string): Record<string, string> {
  const attrs: Record<string, string> = {};

  const attrPattern = /<div[^>]*class="attr[^"]*"[^>]*>[\s\S]*?<span[^>]*class="labl"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<span[^>]*class="valu"[^>]*>([\s\S]*?)<\/span>/gi;
  let match;
  while ((match = attrPattern.exec(html)) !== null) {
    const key = match[1].replace(/<[^>]+>/g, '').replace(/:/g, '').trim().toLowerCase();
    const value = match[2].replace(/<[^>]+>/g, '').trim();
    if (key && value) attrs[key] = value;
  }

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

// Fetch a URL through Apify's residential proxy
async function fetchViaApifyProxy(url: string, apifyToken: string): Promise<string | null> {
  // Use Apify's proxy with residential group
  const proxyUrl = `http://auto:${apifyToken}@proxy.apify.com:8000`;

  // We can't use HTTP proxies directly in fetch(), so use Apify's web scraper API instead
  // The simplest approach: use Apify's "request queue" style fetch via their API
  try {
    const resp = await fetch('https://api.apify.com/v2/browser-info', {
      headers: { 'Authorization': `Bearer ${apifyToken}` },
    });
    
    // Use Apify's Actor for simple HTTP requests with proxy
    const runResp = await fetch(
      `https://api.apify.com/v2/acts/apify~website-content-crawler/runs?token=${apifyToken}&waitForFinish=30`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrls: [{ url }],
          maxCrawlPages: 1,
          crawlerType: 'cheerio',
          proxyConfiguration: {
            useApifyProxy: true,
            apifyProxyGroups: ['RESIDENTIAL'],
          },
          saveHtml: true,
          maxRequestRetries: 2,
        }),
      }
    );

    if (!runResp.ok) {
      console.error('[apify-backfill] Actor run failed:', runResp.status);
      return null;
    }

    const runData = await runResp.json();
    const datasetId = runData?.data?.defaultDatasetId;
    if (!datasetId) return null;

    // Fetch results
    const dataResp = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}&format=json`
    );
    if (!dataResp.ok) return null;

    const items = await dataResp.json();
    if (items && items.length > 0) {
      return items[0].html || items[0].text || null;
    }
    return null;
  } catch (err) {
    console.error('[apify-backfill] Proxy fetch error:', err);
    return null;
  }
}

// Simpler approach: use Apify's sendRequest actor for raw HTTP
async function fetchViaApifySendRequest(url: string, apifyToken: string): Promise<string | null> {
  try {
    // Use the simple HTTP request actor
    const runResp = await fetch(
      `https://api.apify.com/v2/acts/apify~http-request/runs?token=${apifyToken}&waitForFinish=30`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          proxyConfiguration: {
            useApifyProxy: true,
            apifyProxyGroups: ['RESIDENTIAL'],
          },
        }),
      }
    );

    if (!runResp.ok) {
      // Fallback: try the website content crawler
      return await fetchViaApifyProxy(url, apifyToken);
    }

    const runData = await runResp.json();
    const datasetId = runData?.data?.defaultDatasetId;
    if (!datasetId) return await fetchViaApifyProxy(url, apifyToken);

    const dataResp = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}&format=json`
    );
    if (!dataResp.ok) return null;

    const items = await dataResp.json();
    if (items && items.length > 0) {
      return items[0].body || items[0].html || null;
    }
    return null;
  } catch (err) {
    console.error('[apify-backfill] sendRequest error:', err);
    return await fetchViaApifyProxy(url, apifyToken);
  }
}

export default async function handler(req: any, res: any) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apifyToken = process.env.APIFY_TOKEN;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apifyToken || apifyToken === 'your-apify-token') {
    return res.status(500).json({ 
      error: 'APIFY_TOKEN not configured',
      setup: 'Add your Apify API token to Vercel environment variables: Settings → Environment Variables → APIFY_TOKEN'
    });
  }
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Missing Supabase credentials' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const batchSize = Math.min(parseInt(req.query.batch || '10', 10), 50);
  const offset = parseInt(req.query.offset || '0', 10);

  // Get listings missing odometer data
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
    return res.status(200).json({ message: 'No listings need odometer backfill', updated: 0 });
  }

  const { count: totalRemaining } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('mileage', 0)
    .not('source_url', 'is', null)
    .like('source_url', '%craigslist.org%');

  const results: any[] = [];
  let updated = 0;
  let deleted = 0;
  let failed = 0;
  let noOdometer = 0;

  for (const listing of listings) {
    try {
      const html = await fetchViaApifySendRequest(listing.source_url, apifyToken);

      if (!html) {
        failed++;
        results.push({ id: listing.id, status: 'fetch_failed' });
        continue;
      }

      if (html.includes('This posting has been deleted') || html.includes('This posting has expired')) {
        deleted++;
        // Mark as inactive since the listing is gone
        await supabase.from('listings').update({ is_active: false }).eq('id', listing.id);
        results.push({ id: listing.id, status: 'deleted_marked_inactive' });
        continue;
      }

      const attrs = parseListingPage(html);
      const odometer = parseOdometer(attrs['odometer'] || attrs['odometer_ld'] || '');

      // Build update payload with all extracted data
      const updateData: Record<string, any> = {};
      if (odometer > 0) updateData.mileage = odometer;

      // Extract VIN
      const vin = attrs['vin'] || attrs['vin_ld'] || null;
      if (vin && vin.length === 17) updateData.vin = vin.toUpperCase();

      // Extract other attributes
      if (attrs['condition']) updateData.condition = attrs['condition'];
      if (attrs['transmission']) updateData.transmission = attrs['transmission'];

      if (Object.keys(updateData).length > 0) {
        const { error: updateErr } = await supabase
          .from('listings')
          .update(updateData)
          .eq('id', listing.id);

        if (!updateErr) {
          updated++;
          results.push({ id: listing.id, status: 'updated', ...updateData, title: listing.title });

          // If VIN found, try to decode it and enrich the listing
          if (updateData.vin) {
            try {
              const vinResp = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${updateData.vin}?format=json`);
              if (vinResp.ok) {
                const vinData = await vinResp.json();
                const r = vinData?.Results?.[0];
                if (r && r.ErrorCode === '0') {
                  const vinUpdate: Record<string, any> = {};
                  if (r.Trim) vinUpdate.trim_level = r.Trim;
                  if (r.EngineModel) vinUpdate.engine = r.EngineModel;
                  if (r.DriveType) vinUpdate.drivetrain = r.DriveType;
                  if (r.FuelTypePrimary) vinUpdate.fuel_type = r.FuelTypePrimary;
                  if (r.TransmissionStyle) vinUpdate.transmission = r.TransmissionStyle;
                  if (r.BodyClass) vinUpdate.body_type = r.BodyClass;
                  if (Object.keys(vinUpdate).length > 0) {
                    await supabase.from('listings').update(vinUpdate).eq('id', listing.id);
                  }
                }
              }
            } catch {}
          }
        } else {
          results.push({ id: listing.id, status: 'update_error', error: updateErr.message });
        }
      } else {
        noOdometer++;
        results.push({ id: listing.id, status: 'no_data_found', attrs_found: Object.keys(attrs) });
      }
    } catch (err: any) {
      failed++;
      results.push({ id: listing.id, status: 'error', error: err.message });
    }
  }

  return res.status(200).json({
    processed: listings.length,
    updated,
    deleted,
    failed,
    noOdometer,
    remaining: (totalRemaining || 0) - updated - deleted,
    results,
  });
}
