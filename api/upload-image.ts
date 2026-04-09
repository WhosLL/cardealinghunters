// api/upload-image.ts
//
// POST /api/upload-image
// Body: { imageUrl: string, listingId: string }
//
// Downloads an image from a remote URL, uploads it to the `listing-images`
// Supabase Storage bucket, and updates the corresponding row in `listings`
// with the new public URL.
//
// IMPORTANT: This endpoint MUST run with the service_role key, NOT the
// anon key, because:
//   1. Storage writes require either the service role or specific RLS policies
//   2. The `listings` table write policies were intentionally locked down,
//      so only the service role can UPDATE.
//
// Required environment variables (Vercel project settings → Environment Variables):
//   - SUPABASE_URL              (your project URL, no VITE_ prefix)
//   - SUPABASE_SERVICE_ROLE_KEY (secret — never expose to the browser)

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageUrl, listingId } = req.body || {};

    if (!imageUrl || !listingId) {
      return res
        .status(400)
        .json({ error: 'imageUrl and listingId are required' });
    }

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({
        error:
          'Server misconfigured: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing',
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Download the image. Craigslist blocks some user agents; pretend to be a browser.
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Referer: 'https://www.craigslist.org/',
      },
    });

    if (!imageResponse.ok) {
      return res.status(400).json({
        error: `Failed to download image from source (${imageResponse.status})`,
      });
    }

    const contentType =
      imageResponse.headers.get('content-type') || 'image/jpeg';

    // Sanity check: make sure it's actually an image
    if (!contentType.startsWith('image/')) {
      return res.status(400).json({
        error: `Source URL did not return an image (got ${contentType})`,
      });
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let ext = 'jpg';
    if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('webp')) ext = 'webp';
    else if (contentType.includes('gif')) ext = 'gif';

    const storagePath = `listings/${listingId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('listing-images')
      .upload(storagePath, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('[upload-image] storage upload failed', uploadError);
      return res
        .status(500)
        .json({ error: 'Storage upload failed: ' + uploadError.message });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('listing-images').getPublicUrl(storagePath);

    const { error: updateError } = await supabase
      .from('listings')
      .update({ image_url: publicUrl })
      .eq('id', listingId);

    if (updateError) {
      console.error('[upload-image] db update failed', updateError);
      return res
        .status(500)
        .json({ error: 'DB update failed: ' + updateError.message });
    }

    return res.status(200).json({ success: true, publicUrl });
  } catch (err: any) {
    console.error('[upload-image] unexpected error', err);
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
}
