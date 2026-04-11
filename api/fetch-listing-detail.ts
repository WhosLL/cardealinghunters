// api/fetch-listing-detail.ts
// Fetches a single Craigslist listing page and extracts structured attributes
// (odometer, VIN, condition, transmission).
//
// GET /api/fetch-listing-detail?url=<craigslist_listing_url>

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

export default async function handler(req: any, res: any) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.query.url as string;
  if (!url) {
    return res.status(400).json({ error: 'url parameter required' });
  }

  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith('.craigslist.org')) {
      return res.status(400).json({ error: 'URL must be craigslist.org' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      return res.status(502).json({ error: `Craigslist returned ${response.status}` });
    }

    const html = await response.text();

    if (html.includes('This posting has been deleted') || html.includes('This posting has expired')) {
      return res.status(200).json({ status: 'deleted' });
    }

    const attrs = parseListingPage(html);
    const odometer = parseOdometer(attrs['odometer'] || attrs['odometer_ld'] || '');
    const vin = attrs['vin'] || attrs['vin_ld'] || null;
    const condition = attrs['condition'] || null;
    const transmission = attrs['transmission'] || null;
    const titleStatus = attrs['title status'] || null;

    return res.status(200).json({
      status: 'ok',
      odometer,
      vin,
      condition,
      transmission,
      titleStatus,
      allAttributes: attrs,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Fetch failed' });
  }
}
