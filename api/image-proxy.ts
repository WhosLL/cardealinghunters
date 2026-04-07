/**
 * Vercel Edge Function: Image Proxy for Craigslist
 *
 * Craigslist blocks direct image hotlinking from browsers.
 * This proxy fetches the image server-side and streams it back,
 * bypassing the hotlink block since the request comes from the server.
 *
 * Usage: /api/image-proxy?url=ENCODED_IMAGE_URL
 *
 * Deploy to: api/image-proxy.ts
 */

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Only allow proxying Craigslist image domains for security
  const allowedDomains = [
    'images.craigslist.org',
    'ci.craigslist.org',
  ];

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!allowedDomains.some(domain => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain))) {
    return new Response(JSON.stringify({ error: 'Domain not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: 'https://www.craigslist.org/',
      },
    });

    if (!imageResponse.ok) {
      return new Response(JSON.stringify({ error: 'Upstream returned ' + imageResponse.status }), {
        status: imageResponse.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const contentType = imageResponse.headers.get('Content-Type') || 'image/jpeg';
    const imageBody = imageResponse.body;

    return new Response(imageBody, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Failed to fetch image' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
