import { createClient } from '@supabase/supabase-js';

/**
 * Backfill images for listings that have a source_url but no image_url.
 * Fetches each listing's Craigslist page and extracts the og:image meta tag,
 * or parses the JSON-LD on the individual listing page.
 *
 * Processes in batches to avoid timeouts.
 * Trigger via: GET /api/backfill-images?batch=50
 */

const supabaseUrl = 'https://sbhjuntwwyavdnpsgzjb.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY || '';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const batchSize = Math.min(parseInt(req.query.batch as string) || 30, 100);
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get listings with source_url but no image_url
    const { data: listings, error } = await supabase
      .from('listings')
      .select('id, source_url')
      .not('source_url', 'eq', '')
      .not('source_url', 'is', null)
      .or('image_url.is.null,image_url.eq.')
      .limit(batchSize);

    if (error) {
      return res.status(500).json({ error: 'DB query failed', details: error.message });
    }

    if (!listings || listings.length === 0) {
      return res.status(200).json({ message: 'No listings need backfilling.', updated: 0, remaining: 0 });
    }

    let updated = 0;
    let failed = 0;

    // Process listings concurrently in small groups of 5
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

    // Check how many still need backfilling
    const { count } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .not('source_url', 'eq', '')
      .not('source_url', 'is', null)
      .or('image_url.is.null,image_url.eq.');

    return res.status(200).json({
      message: 'Backfilled ' + updated + ' listings (' + failed + ' failed).',
      updated,
      failed,
      remaining: count || 0,
      hint: count && count > 0
        ? 'Call this endpoint again to process more. ' + Math.ceil((count || 0) / batchSize) + ' batches remaining.'
        : 'All listings have images now!',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Backfill failed' });
  }
}

/**
 * Fetch a single Craigslist listing page and extract the image URL.
 * Tries multiple methods:
 * 1. og:image meta tag
 * 2. JSON-LD structured data
 * 3. First large image src in the page
 */
async function fetchImageFromListingPage(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return '';
    const html = await response.text();

    // Method 1: og:image meta tag (most reliable)
    const ogMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i)
      || html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:image"/i);
    if (ogMatch && ogMatch[1].includes('craigslist.org')) {
      return ogMatch[1];
    }

    // Method 2: JSON-LD on the individual listing page
    const ldMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
    if (ldMatch) {
      try {
        const ld = JSON.parse(ldMatch[1]);
        const images = ld.image || (ld.itemListElement?.[0]?.item?.image);
        if (Array.isArray(images) && images.length > 0) {
          return images[0];
        }
        if (typeof images === 'string') return images;
      } catch {}
    }

    // Method 3: First image src matching craigslist image CDN
    const imgMatch = html.match(/src="(https:\/\/images\.craigslist\.org\/[^"]+\.jpg)"/i);
    if (imgMatch) return imgMatch[1];

    return '';
  } catch {
    return '';
  }
  }
