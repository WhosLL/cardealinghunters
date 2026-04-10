// api/backfill-images.ts
//
// GET /api/backfill-images?batch=30
//
// Walks listings that are missing an image_url, visits each listing's
// source page on Craigslist, tries to extract an image URL from the page
// (og:image → JSON-LD → regex), and updates the row.
//
// This endpoint MUST run with the service_role key because it writes to
// the `listings` table and those write policies are locked down to
// service role only.
//
// Required environment variables:
//   - SUPABASE_URL
//   - SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const ALLOWED_ORIGINS = [
  'https://cardealinghunters.vercel.app',
  'http://localhost:5173',
];

export default async function handler(req: any, res: any) {
  const origin = req.headers?.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({
      error:
        'Server misconfigured: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing',
    });
  }

  const batchSize = Math.min(parseInt(req.query.batch as string) || 30, 100);
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const { data: listings, error } = await supabase
      .from('listings')
      .select('id, source_url')
      .not('source_url', 'eq', '')
      .not('source_url', 'is', null)
      .or('image_url.is.null,image_url.eq.')
      .order('created_at', { ascending: false })
      .limit(batchSize);

    if (error) {
      return res
        .status(500)
        .json({ error: 'DB query failed', details: error.message });
    }

    if (!listings || listings.length === 0) {
      return res
        .status(200)
        .json({ message: 'No listings need backfilling.', updated: 0, remaining: 0 });
    }

    let updated = 0;
    let failed = 0;

    for (let i = 0; i < listings.length; i += 5) {
      const batch = listings.slice(i, i + 5);
      const results = await Promise.allSettled(
        batch.map(async (listing) => {
          const imageUrl = await fetchImageFromListingPage(listing.source_url);
          if (imageUrl) {
            const { error: updateError } = await supabase
              .from('listings')
              .update({ image_url: imageUrl })
              .eq('id', listing.id);
            if (!updateError) return true;
          }
          return false;
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          updated++;
        } else {
          failed++;
        }
      }
    }

    const { count } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .not('source_url', 'eq', '')
      .not('source_url', 'is', null)
      .or('image_url.is.null,image_url.eq.');

    console.log(
      `[backfill-images] batch=${batchSize} updated=${updated} failed=${failed} remaining=${count || 0}`
    );

    return res.status(200).json({
      message: `Backfilled ${updated} listings (${failed} failed).`,
      updated,
      failed,
      remaining: count || 0,
    });
  } catch (err: any) {
    console.error('[backfill-images] fatal', err);
    return res.status(500).json({ error: err.message || 'Backfill failed' });
  }
}

async function fetchImageFromListingPage(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return '';
    const html = await response.text();

    // 1. og:image meta tag
    const ogMatch =
      html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i) ||
      html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:image"/i);
    if (ogMatch && ogMatch[1].includes('craigslist.org')) {
      return ogMatch[1];
    }

    // 2. JSON-LD structured data
    const ldMatch = html.match(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/
    );
    if (ldMatch) {
      try {
        const ld = JSON.parse(ldMatch[1]);
        const rawImage =
          ld.image || ld.itemListElement?.[0]?.item?.image || null;

        if (Array.isArray(rawImage) && rawImage.length > 0) {
          // Array of strings or array of ImageObject
          const first = rawImage[0];
          if (typeof first === 'string') return first;
          if (typeof first === 'object' && first?.url) return first.url;
        } else if (typeof rawImage === 'string') {
          return rawImage;
        } else if (typeof rawImage === 'object' && rawImage?.url) {
          return rawImage.url;
        }
      } catch {
        // fall through
      }
    }

    // 3. Direct regex fallback
    const imgMatch = html.match(
      /src="(https:\/\/images\.craigslist\.org\/[^"]+\.jpg)"/i
    );
    if (imgMatch) return imgMatch[1];

    return '';
  } catch {
    return '';
  }
}
