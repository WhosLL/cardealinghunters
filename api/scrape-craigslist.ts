// api/scrape-craigslist.ts
//
// Vercel serverless function that scrapes a Craigslist search results page
// and returns structured listing data. Uses JSON-LD as the primary parsing
// path with a regex-based HTML fallback.
//
// Changes from previous version:
//   - Defensive handling of `item.image` (can be string | array | ImageObject per schema.org)
//   - Correct position parsing (was coercing a string, now parseInt)
//   - Diagnostic counters so you can see in logs how many images were extracted
//   - Improved HTML fallback for lazy-loaded images (srcset, data-src, data-ids)

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const searchUrl = req.query.searchUrl as string;
  if (!searchUrl || !searchUrl.includes("craigslist.org")) {
    return res.status(400).json({ error: "Valid Craigslist URL required" });
  }

  try {
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      return res.status(502).json({ error: "Craigslist returned " + response.status });
    }

    const html = await response.text();
    const { listings, source, imagesFound } = parseCraigslistHTML(html, searchUrl);

    // Log for debugging in Vercel runtime logs
    console.log(
      `[scrape-craigslist] url=${searchUrl} parser=${source} total=${listings.length} withImage=${imagesFound}`
    );

    return res.status(200).json({
      listings,
      count: listings.length,
      parser: source,
      imagesFound,
    });
  } catch (err: any) {
    console.error("[scrape-craigslist] fatal", err);
    return res.status(500).json({ error: err.message || "Scrape failed" });
  }
}

type ParsedListing = {
  title: string;
  price: string;
  url: string;
  location: string;
  imageUrl: string;
  description?: string;
};

type ParseResult = {
  listings: ParsedListing[];
  source: "json-ld" | "modern-html" | "old-html" | "gallery-html" | "empty";
  imagesFound: number;
};

function parseCraigslistHTML(html: string, baseUrl: string): ParseResult {
  const domainMatch = baseUrl.match(/https?:\/\/[^/]+/);
  const domain = domainMatch ? domainMatch[0] : "";

  // -----------------------------
  // PRIMARY PATH: JSON-LD
  // -----------------------------
  const jsonLdMatch = html.match(
    /<script[^>]*id="ld_searchpage_results"[^>]*>([\s\S]*?)<\/script>/
  );

  if (jsonLdMatch) {
    try {
      const jsonLd = JSON.parse(jsonLdMatch[1]);
      const items = jsonLd.itemListElement || [];
      const urlMap = extractUrlsFromHtml(html, domain);
      // Also extract an image map from the HTML as a secondary image source,
      // indexed by listing position. Some regions populate JSON-LD images,
      // others populate only HTML data-ids.
      const imageMapByPosition = extractImageMapFromHtml(html);

      const parsed = items
        .map((entry: any, idx: number) => {
          const item = entry.item || {};
          const title = (item.name || "").trim();
          if (!title || title.length < 5) return null;

          const offers = item.offers || {};
          const price = String(offers.price ?? "0");

          const address = offers.availableAtOrFrom?.address || {};
          const location = [address.addressLocality, address.addressRegion]
            .filter(Boolean)
            .join(", ");

          // BUGFIX: item.image can be a string, an array of strings, or an
          // ImageObject { url: "..." }. Handle all three plus missing.
          let imageUrl = extractJsonLdImage(item.image);

          // FALLBACK: if JSON-LD didn't give us an image, try to pull one
          // from the HTML by position.
          if (!imageUrl) {
            imageUrl = imageMapByPosition[idx] || "";
          }

          // BUGFIX: entry.position is a string in Craigslist JSON-LD.
          // Use parseInt and handle NaN.
          const positionRaw = entry.position;
          const position = Number.isFinite(Number(positionRaw))
            ? parseInt(positionRaw, 10)
            : idx + 1;
          const url = urlMap[position - 1] || urlMap[idx] || "";

          return {
            title,
            price,
            url,
            location,
            imageUrl,
            description: item.description || "",
          } as ParsedListing;
        })
        .filter(Boolean) as ParsedListing[];

      if (parsed.length > 0) {
        return {
          listings: parsed,
          source: "json-ld",
          imagesFound: parsed.filter((l) => l.imageUrl).length,
        };
      }
    } catch (e) {
      console.warn("[scrape-craigslist] JSON-LD parse failed", e);
    }
  }

  // -----------------------------
  // FALLBACK PATHS: HTML regex
  // -----------------------------
  const modernPattern =
    /<li[^>]*class="[^"]*cl-(?:static-search-result|search-result)[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;

  const modern: ParsedListing[] = [];
  let match: RegExpExecArray | null;
  while ((match = modernPattern.exec(html)) !== null) {
    const listing = extractFromBlock(match[1], domain);
    if (listing) modern.push(listing);
  }
  if (modern.length > 0) {
    return {
      listings: modern,
      source: "modern-html",
      imagesFound: modern.filter((l) => l.imageUrl).length,
    };
  }

  const oldPattern = /<li[^>]*class="[^"]*result-row[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
  const old: ParsedListing[] = [];
  while ((match = oldPattern.exec(html)) !== null) {
    const listing = extractFromBlock(match[1], domain);
    if (listing) old.push(listing);
  }
  if (old.length > 0) {
    return {
      listings: old,
      source: "old-html",
      imagesFound: old.filter((l) => l.imageUrl).length,
    };
  }

  const cardPattern =
    /<div[^>]*class="[^"]*gallery-card[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
  const cards: ParsedListing[] = [];
  while ((match = cardPattern.exec(html)) !== null) {
    const listing = extractFromBlock(match[1], domain);
    if (listing) cards.push(listing);
  }
  if (cards.length > 0) {
    return {
      listings: cards,
      source: "gallery-html",
      imagesFound: cards.filter((l) => l.imageUrl).length,
    };
  }

  return { listings: [], source: "empty", imagesFound: 0 };
}

/**
 * Normalize the schema.org image field to a single URL string.
 * Per schema.org, the image property can be:
 *   - a string URL
 *   - an array of string URLs
 *   - an ImageObject { url: "...", contentUrl: "..." }
 *   - an array of ImageObjects
 */
function extractJsonLdImage(raw: unknown): string {
  if (!raw) return "";

  if (typeof raw === "string") {
    return raw;
  }

  if (Array.isArray(raw)) {
    // Take the first element and recurse.
    if (raw.length === 0) return "";
    return extractJsonLdImage(raw[0]);
  }

  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.url === "string") return obj.url;
    if (typeof obj.contentUrl === "string") return obj.contentUrl;
  }

  return "";
}

/**
 * Scan the raw HTML once for image references and return a position-indexed
 * map. Craigslist typically embeds image IDs in a data-ids attribute on each
 * listing element, like: data-ids="1:01010_abc123,1:01010_def456"
 *
 * The first ID is usually the thumbnail.
 */
function extractImageMapFromHtml(html: string): Record<number, string> {
  const map: Record<number, string> = {};

  // Strategy 1: look for data-ids attributes in order of appearance.
  const dataIdsPattern = /data-ids="([^"]+)"/gi;
  let idx = 0;
  let match: RegExpExecArray | null;
  while ((match = dataIdsPattern.exec(html)) !== null) {
    const firstId = match[1].split(",")[0]?.split(":").pop();
    if (firstId && firstId.length > 5) {
      map[idx] = `https://images.craigslist.org/${firstId}_300x300.jpg`;
    }
    idx++;
  }

  if (Object.keys(map).length > 0) return map;

  // Strategy 2: look for <img src="https://images.craigslist.org/..."> directly.
  const imgPattern = /<img[^>]+src="(https:\/\/images\.craigslist\.org\/[^"]+\.jpg)"/gi;
  idx = 0;
  while ((match = imgPattern.exec(html)) !== null) {
    map[idx] = match[1];
    idx++;
  }

  return map;
}

function extractUrlsFromHtml(html: string, domain: string): string[] {
  const urls: string[] = [];
  const linkPattern =
    /href="((?:https?:\/\/[^"]*craigslist[^"]*|\/[^"]+)\/d\/[^"]+\.html)"/gi;
  let match: RegExpExecArray | null;
  while ((match = linkPattern.exec(html)) !== null) {
    let url = match[1];
    if (!url.startsWith("http")) url = domain + url;
    urls.push(url);
  }
  return urls;
}

function extractFromBlock(block: string, domain: string): ParsedListing | null {
  const titleMatch =
    block.match(
      /<[^>]*class="[^"]*(?:titlestring|result-title|posting-title|title)[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i
    ) || block.match(/<a[^>]*>([\s\S]*?)<\/a>/i);
  const title = titleMatch
    ? titleMatch[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
    : "";
  if (!title || title.length < 5) return null;

  const priceMatch = block.match(/\$\s*([\d,]+)/);
  const price = priceMatch ? priceMatch[1].replace(/,/g, "") : "0";

  const urlMatch =
    block.match(/href="(https?:\/\/[^"]*craigslist[^"]*)"/i) ||
    block.match(/href="(\/[^"]+\.html[^"]*)"/i) ||
    block.match(/href="(\/[^"]+)"/i);
  let url = urlMatch ? urlMatch[1] : "";
  if (url && !url.startsWith("http")) url = domain + url;

  const locMatch = block.match(
    /<span[^>]*class="[^"]*(?:location|subareaname|result-hood)[^"]*"[^>]*>\s*\(?\s*([\s\S]*?)\s*\)?\s*<\/span>/i
  );
  const location = locMatch ? locMatch[1].replace(/<[^>]+>/g, "").trim() : "";

  // Try several image-extraction strategies, in order of reliability.
  let imageUrl = "";

  // 1. Regular src= on an image tag
  const srcMatch = block.match(
    /<img[^>]+src="(https?:\/\/[^"]*(?:\.jpg|\.jpeg|\.png|\.webp)[^"]*)"/i
  );
  if (srcMatch) imageUrl = srcMatch[1];

  // 2. data-src (lazy loading)
  if (!imageUrl) {
    const dataSrcMatch = block.match(
      /<img[^>]+data-src="(https?:\/\/[^"]*(?:\.jpg|\.jpeg|\.png|\.webp)[^"]*)"/i
    );
    if (dataSrcMatch) imageUrl = dataSrcMatch[1];
  }

  // 3. srcset (first URL)
  if (!imageUrl) {
    const srcsetMatch = block.match(/srcset="([^"]+)"/i);
    if (srcsetMatch) {
      const firstUrl = srcsetMatch[1].trim().split(/\s+/)[0];
      if (firstUrl && firstUrl.startsWith("http")) imageUrl = firstUrl;
    }
  }

  // 4. data-ids attribute with Craigslist image ID format
  if (!imageUrl) {
    const dataIdsMatch = block.match(/data-ids="([^"]+)"/i);
    if (dataIdsMatch) {
      const firstId = dataIdsMatch[1].split(",")[0]?.split(":").pop();
      if (firstId && firstId.length > 5) {
        imageUrl = `https://images.craigslist.org/${firstId}_300x300.jpg`;
      }
    }
  }

  return { title, price, url, location, imageUrl };
}
