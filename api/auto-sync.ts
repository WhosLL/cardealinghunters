// api/auto-sync.ts
// Combined endpoint: scrapes new listings from all active sources + removes expired ones.
// Designed to run on a frequent schedule (every 1-2 hours).

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

const APIFY_TOKEN = process.env.APIFY_TOKEN || '';
const MAX_AGE_DAYS = 45;
const EXPIRE_CHECK_BATCH = 25;

// ── Auth ──────────────────────────────────────────────────────────────
function isAuthorized(req: any): boolean {
  // Vercel cron
  if (req.headers['x-vercel-cron'] === 'true') return true;
  // CRON_SECRET header
  const secret = process.env.CRON_SECRET || '';
  if (secret && req.headers['x-cron-secret'] === secret) return true;
  // Bearer service key
  if (req.headers['authorization'] === `Bearer ${process.env.SUPABASE_SERVICE_KEY}`) return true;
  return false;
}

// ── Craigslist HTML parser (same logic as scrape-craigslist.ts) ───────
interface RawListing {
  title: string;
  price: string;
  url: string;
  location: string;
  imageUrl: string;
}

function parseCraigslistHTML(html: string, baseUrl: string): RawListing[] {
  const domainMatch = baseUrl.match(/https?:\/\/[^/]+/);
  const domain = domainMatch ? domainMatch[0] : '';
  const listings: RawListing[] = [];

  // Try JSON-LD first
  const jsonLdMatch = html.match(/<script[^>]*id="ld_searchpage_results"[^>]*>([\s\S]*?)<\/script>/);
  if (jsonLdMatch) {
    try {
      const jsonLd = JSON.parse(jsonLdMatch[1]);
      const items = jsonLd.itemListElement || [];
      for (const item of items) {
        const title = item.name || '';
        const url = item.url || '';
        const price = item.offers?.price || item.offers?.lowPrice || '';
        const location = item.offers?.availableAtOrFrom?.address?.addressLocality || '';
        let imageUrl = '';
        if (typeof item.image === 'string') imageUrl = item.image;
        else if (Array.isArray(item.image)) imageUrl = item.image[0] || '';
        else if (item.image?.url) imageUrl = item.image.url;
        
        if (title && url) {
          listings.push({ title, price: String(price), url, location, imageUrl });
        }
      }
    } catch {}
  }

  // Fallback: HTML parsing
  if (listings.length === 0) {
    const blocks = html.split(/<li class="cl-static-search-result"/);
    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i];
      const titleMatch = block.match(/class="title"[^>]*>([^<]+)/);
      const priceMatch = block.match(/class="price"[^>]*>([^<]+)/);
      const urlMatch = block.match(/href="([^"]+)"/);
      const locMatch = block.match(/class="location"[^>]*>([^<]+)/);
      const imgMatch = block.match(/src="(https?:\/\/[^"]*(?:\.jpg|\.jpeg|\.png|\.webp)[^"]*)"/i);

      if (titleMatch) {
        listings.push({
          title: titleMatch[1].trim(),
          price: priceMatch ? priceMatch[1].replace(/[^0-9.]/g, '') : '',
          url: urlMatch ? (urlMatch[1].startsWith('http') ? urlMatch[1] : domain + urlMatch[1]) : '',
          location: locMatch ? locMatch[1].trim() : '',
          imageUrl: imgMatch ? imgMatch[1] : '',
        });
      }
    }
  }

  return listings;
}

// ── Listing processing (dedup + insert) ──────────────────────────────
const JUNK_KEYWORDS = [
  'parts', 'parting out', 'engine only', 'transmission only', 'wheels only',
  'tires only', 'rims only', 'wanted', 'looking for', 'iso ', 'wtb ',
  'scrap', 'junk car', 'cash for', 'floor mat', 'car cover', 'dash cam',
  'bumper', 'hood only', 'door only', 'headlight', 'taillight',
];

const KNOWN_MAKES: Record<string, string> = {
  'toyota': 'Toyota', 'honda': 'Honda', 'ford': 'Ford', 'chevrolet': 'Chevrolet',
  'chevy': 'Chevrolet', 'nissan': 'Nissan', 'bmw': 'BMW', 'mercedes': 'Mercedes-Benz',
  'hyundai': 'Hyundai', 'kia': 'Kia', 'subaru': 'Subaru', 'jeep': 'Jeep',
  'dodge': 'Dodge', 'ram': 'RAM', 'gmc': 'GMC', 'volkswagen': 'Volkswagen',
  'vw': 'Volkswagen', 'mazda': 'Mazda', 'lexus': 'Lexus', 'acura': 'Acura',
  'infiniti': 'Infiniti', 'audi': 'Audi', 'volvo': 'Volvo', 'tesla': 'Tesla',
  'porsche': 'Porsche', 'cadillac': 'Cadillac', 'buick': 'Buick', 'lincoln': 'Lincoln',
  'chrysler': 'Chrysler', 'mini': 'Mini', 'mitsubishi': 'Mitsubishi', 'pontiac': 'Pontiac',
  'saturn': 'Saturn', 'scion': 'Scion', 'land rover': 'Land Rover', 'jaguar': 'Jaguar',
  'alfa romeo': 'Alfa Romeo', 'fiat': 'Fiat', 'genesis': 'Genesis',
};

function extractYear(title: string): number {
  const match = title.match(/\b(19[89]\d|20[0-2]\d)\b/);
  return match ? parseInt(match[0]) : 0;
}

function extractMake(title: string): string {
  const tl = title.toLowerCase();
  for (const make of ['land rover', 'alfa romeo', 'mercedes-benz']) {
    if (tl.includes(make)) return KNOWN_MAKES[make] || make;
  }
  for (const word of tl.split(/[\s,\-\/\|]+/)) {
    if (KNOWN_MAKES[word]) return KNOWN_MAKES[word];
  }
  if (tl.includes('mercedes')) return 'Mercedes-Benz';
  return 'Unknown';
}

function extractModel(title: string, make: string): string {
  if (make === 'Unknown') {
    const m = title.match(/\b(?:19|20)\d{2}\b\s+\S+\s+(\S+)/);
    return m ? m[1] : 'Unknown';
  }
  // Try to find the word after the make name
  const makeVariants = Object.entries(KNOWN_MAKES).filter(([_, v]) => v === make).map(([k]) => k);
  for (const variant of makeVariants) {
    const regex = new RegExp(variant.replace(/[-]/g, '[-\\s]?') + '\\s+(\\S+)', 'i');
    const match = title.match(regex);
    if (match && match[1]) {
      const candidate = match[1].replace(/[^a-zA-Z0-9\-]/g, '');
      if (candidate.length > 1 && !/^\d{4}$/.test(candidate)) return candidate;
    }
  }
  return 'Unknown';
}

function extractMileage(text: string): number {
  const patterns = [
    /(\d{1,3})[,.](\d{3})\s*(?:miles|mi\b)/i,
    /(\d{2,3})k\s*(?:miles|mi\b)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const val = m[2] ? parseInt(m[1] + m[2]) : parseInt(m[1]) * 1000;
      if (val >= 1000 && val < 500000) return val;
    }
  }
  return 0;
}

async function processAndInsertListings(rawListings: RawListing[]): Promise<number> {
  let inserted = 0;
  
  // Get existing source_urls to dedup
  const urls = rawListings.map(l => l.url).filter(Boolean);
  const { data: existing } = await supabase
    .from('listings')
    .select('source_url')
    .in('source_url', urls);
  const existingUrls = new Set((existing || []).map(e => e.source_url));

  for (const raw of rawListings) {
    if (!raw.url || existingUrls.has(raw.url)) continue;
    
    const titleLower = raw.title.toLowerCase();
    if (JUNK_KEYWORDS.some(k => titleLower.includes(k))) continue;
    
    const price = parseFloat(raw.price) || 0;
    if (price < 1000 || price > 200000) continue;
    
    const year = extractYear(raw.title);
    if (!year) continue;
    
    const make = extractMake(raw.title);
    const model = extractModel(raw.title, make);
    if (make === 'Unknown') continue;
    
    const mileage = extractMileage(raw.title);

    const { data: record, error } = await supabase.from('listings').insert({
      title: raw.title,
      price,
      year,
      make,
      model,
      mileage,
      location: raw.location || null,
      source: 'craigslist',
      source_url: raw.url,
      image_url: raw.imageUrl || null,
      description: raw.title,
      is_active: true,
      market_value: 0,
      deal_score: 'fair',
    }).select('id').single();

    if (!error && record) {
      inserted++;
      try { await supabase.rpc('update_listing_market_value', { lid: record.id }); } catch {}
    }
  }
  
  return inserted;
}

// ── Expiration checker ───────────────────────────────────────────────
async function checkExpired(): Promise<{ aged: number; checked: number; expired: number }> {
  // Age-based
  const { data: agedData } = await supabase
    .from('listings')
    .update({ is_active: false })
    .eq('is_active', true)
    .lt('created_at', new Date(Date.now() - MAX_AGE_DAYS * 86400000).toISOString())
    .select('id');
  const aged = agedData?.length || 0;

  // URL-based: check oldest active listings
  const { data: toCheck } = await supabase
    .from('listings')
    .select('id, source_url')
    .eq('is_active', true)
    .not('source_url', 'is', null)
    .order('created_at', { ascending: true })
    .limit(EXPIRE_CHECK_BATCH);

  let checked = 0, expired = 0;
  
  if (toCheck) {
    for (const listing of toCheck) {
      checked++;
      try {
        const resp = await fetch(listing.source_url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          redirect: 'follow',
        });
        const text = await resp.text();
        
        const isExpired = resp.status === 404 || resp.status === 410 ||
          text.includes('This posting has expired') ||
          text.includes('This posting has been deleted') ||
          text.includes('This posting has been flagged for removal');

        if (isExpired) {
          await supabase.from('listings').update({ is_active: false }).eq('id', listing.id);
          expired++;
        }
      } catch {
        // Network error — skip, will retry next run
      }
      // 300ms between requests
      await new Promise(r => setTimeout(r, 300));
    }
  }

  return { aged, checked, expired };
}

// ── Main handler ─────────────────────────────────────────────────────
export default async function handler(req: any, res: any) {
  // Also allow admin auth
  let authorized = isAuthorized(req);
  if (!authorized) {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const { data: profile } = await supabase.from('user_profiles').select('is_admin').eq('id', user.id).single();
        if (profile?.is_admin) authorized = true;
      }
    }
  }
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' });

  const results: any = { sources_scraped: 0, new_listings: 0, expire_check: {} };

  try {
    // Step 1: Get all active scrape sources
    const { data: sources } = await supabase
      .from('scrape_sources')
      .select('*')
      .eq('is_active', true)
      .order('last_scraped_at', { ascending: true, nullsFirst: true });

    // Step 2: Scrape each source
    if (sources) {
      for (const source of sources) {
        try {
          const resp = await fetch(source.search_url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
          });

          if (resp.ok) {
            const html = await resp.text();
            const rawListings = parseCraigslistHTML(html, source.search_url);
            const inserted = await processAndInsertListings(rawListings);
            results.new_listings += inserted;
            results.sources_scraped++;

            // Update last_scraped_at
            await supabase
              .from('scrape_sources')
              .update({ last_scraped_at: new Date().toISOString() })
              .eq('id', source.id);

            // Log the run
            await supabase.from('scrape_runs').insert({
              source: 'craigslist',
              search_url: source.search_url,
              status: 'completed',
              listings_added: inserted,
              started_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
            });
          }

          // Delay between sources to avoid rate limiting
          await new Promise(r => setTimeout(r, 2000));
        } catch (err) {
          console.error(`[auto-sync] Failed to scrape ${source.search_url}:`, err);
        }
      }
    }

    // Step 3: Check for expired listings
    results.expire_check = await checkExpired();

    // Step 4: Refresh materialized views
    try {
      await supabase.rpc('refresh_market_stats');
    } catch {}

    return res.status(200).json({
      success: true,
      ...results,
      message: `Scraped ${results.sources_scraped} sources, added ${results.new_listings} new listings, expired ${results.expire_check.expired || 0} listings`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Sync failed' });
  }
}
// sync trigger 1775881056
