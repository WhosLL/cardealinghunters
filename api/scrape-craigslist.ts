export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const searchUrl = req.query.searchUrl as string;
  if (!searchUrl || !searchUrl.includes('craigslist.org')) {
    return res.status(400).json({ error: 'Valid Craigslist URL required' });
  }

  try {
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'Craigslist returned ' + response.status });
    }

    const html = await response.text();
    const listings = parseCraigslistHTML(html, searchUrl);

    return res.status(200).json({ listings, count: listings.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Scrape failed' });
  }
}

function parseCraigslistHTML(html: string, baseUrl: string) {
  const domainMatch = baseUrl.match(/https?:\/\/[^/]+/);
  const domain = domainMatch ? domainMatch[0] : '';

  // ============================================================
  // PRIMARY: Parse JSON-LD structured data (modern CL format)
  // Craigslist embeds all listing data in a <script type="application/ld+json">
  // tag with id="ld_searchpage_results"
  // ============================================================
  const jsonLdMatch = html.match(
    /<script[^>]*id="ld_searchpage_results"[^>]*>([\s\S]*?)<\/script>/
  );

  if (jsonLdMatch) {
    try {
      const jsonLd = JSON.parse(jsonLdMatch[1]);
      const items = jsonLd.itemListElement || [];

      // Also extract URLs from HTML <a> tags since JSON-LD doesn't include them
      const urlMap = extractUrlsFromHtml(html, domain);

      return items
        .map((entry: any) => {
          const item = entry.item || {};
          const title = item.name || '';
          if (!title || title.length < 5) return null;

          const offers = item.offers || {};
          const price = offers.price || '0';
          const address = offers.availableAtOrFrom?.address || {};
          const location = [address.addressLocality, address.addressRegion]
            .filter(Boolean)
            .join(', ');

          // Get first image from the image array
          const images = item.image || [];
          const imageUrl = images.length > 0 ? images[0] : '';

          // Try to match URL by title (JSON-LD items are in same order as HTML links)
          const position = entry.position || 0;
          const url = urlMap[position - 1] || '';

          return { title, price, url, location, imageUrl, description: item.description || '' };
        })
        .filter(Boolean);
    } catch (e) {
      // JSON-LD parsing failed, fall through to HTML patterns
    }
  }

  // ============================================================
  // FALLBACK: Regex-based HTML parsing (older CL formats)
  // ============================================================
  const listings: any[] = [];

  // Pattern 1: Modern CL format (cl-static-search-result or cl-search-result)
  const modernPattern =
    /<li[^>]*class="[^"]*cl-(?:static-search-result|search-result)[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
  let match;

  while ((match = modernPattern.exec(html)) !== null) {
    const listing = extractFromBlock(match[1], domain);
    if (listing) listings.push(listing);
  }

  // Pattern 2: Older format (result-row)
  if (listings.length === 0) {
    const oldPattern = /<li[^>]*class="[^"]*result-row[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
    while ((match = oldPattern.exec(html)) !== null) {
      const listing = extractFromBlock(match[1], domain);
      if (listing) listings.push(listing);
    }
  }

  // Pattern 3: Gallery card format
  if (listings.length === 0) {
    const cardPattern =
      /<div[^>]*class="[^"]*gallery-card[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
    while ((match = cardPattern.exec(html)) !== null) {
      const listing = extractFromBlock(match[1], domain);
      if (listing) listings.push(listing);
    }
  }

  return listings;
}

/**
 * Extract listing URLs from HTML anchor tags.
 * Returns an array of URLs in page order to match with JSON-LD positions.
 */
function extractUrlsFromHtml(html: string, domain: string): string[] {
  const urls: string[] = [];
  // Match links to individual CL listing pages (e.g. /cto/d/title-slug/1234567890.html)
  const linkPattern = /href="((?:https?:\/\/[^"]*craigslist[^"]*|\/[^"]+)\/d\/[^"]+\.html)"/gi;
  let match;
  while ((match = linkPattern.exec(html)) !== null) {
    let url = match[1];
    if (!url.startsWith('http')) url = domain + url;
    urls.push(url);
  }
  return urls;
}

function extractFromBlock(block: string, domain: string) {
  // Title
  const titleMatch =
    block.match(
      /<[^>]*class="[^"]*(?:titlestring|result-title|posting-title|title)[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i
    ) || block.match(/<a[^>]*>([\s\S]*?)<\/a>/i);
  const title = titleMatch
    ? titleMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    : '';
  if (!title || title.length < 5) return null;

  // Price
  const priceMatch = block.match(/\$\s*([\d,]+)/);
  const price = priceMatch ? priceMatch[1].replace(/,/g, '') : '0';

  // URL
  const urlMatch =
    block.match(/href="(https?:\/\/[^"]*craigslist[^"]*)"/i) ||
    block.match(/href="(\/[^"]+\.html[^"]*)"/i) ||
    block.match(/href="(\/[^"]+)"/i);
  let url = urlMatch ? urlMatch[1] : '';
  if (url && !url.startsWith('http')) url = domain + url;

  // Location
  const locMatch = block.match(
    /<span[^>]*class="[^"]*(?:location|subareaname|result-hood)[^"]*"[^>]*>\s*\(?\s*([\s\S]*?)\s*\)?\s*<\/span>/i
  );
  const location = locMatch
    ? locMatch[1].replace(/<[^>]+>/g, '').trim()
    : '';

  // Image
  const imgMatch =
    block.match(
      /src="(https?:\/\/[^"]*(?:\.jpg|\.jpeg|\.png|\.webp)[^"]*)"/i
    ) || block.match(/data-ids="[^"]*?:([^,"\s]+)/i);
  let imageUrl = imgMatch ? imgMatch[1] : '';
  if (imageUrl && !imageUrl.startsWith('http') && imageUrl.length > 10) {
    imageUrl = 'https://images.craigslist.org/' + imageUrl + '_300x300.jpg';
  }

  return { title, price, url, location, imageUrl };
            }
