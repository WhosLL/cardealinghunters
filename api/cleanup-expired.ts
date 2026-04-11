import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const APIFY_TOKEN = process.env.APIFY_TOKEN || '';
const BATCH_SIZE = 20;
const MAX_AGE_DAYS = 45; // Auto-expire anything older than this

interface CleanupResult {
  aged_out: number;
  checked: number;
  expired: number;
  still_active: number;
  errors: number;
}

async function checkUrlAlive(url: string): Promise<'active' | 'expired' | 'error'> {
  // Try direct fetch first (works sometimes)
  try {
    const resp = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      redirect: 'follow',
    });
    const text = await resp.text();
    
    if (resp.status === 404) return 'expired';
    if (resp.status === 410) return 'expired';
    
    // Craigslist shows specific text for expired/deleted posts
    if (text.includes('This posting has expired') ||
        text.includes('This posting has been deleted') ||
        text.includes('This posting has been flagged for removal') ||
        text.includes('post not found')) {
      return 'expired';
    }
    
    if (resp.ok && text.includes('postingbody')) {
      return 'active'; // Has listing content
    }
    
    // If we got blocked (403), try Apify
    if (resp.status === 403 && APIFY_TOKEN) {
      return await checkUrlViaApify(url);
    }
    
    return 'error';
  } catch {
    // Network error — try Apify fallback
    if (APIFY_TOKEN) {
      return await checkUrlViaApify(url);
    }
    return 'error';
  }
}

async function checkUrlViaApify(url: string): Promise<'active' | 'expired' | 'error'> {
  try {
    const resp = await fetch('https://api.apify.com/v2/acts/apify~website-content-crawler/run-sync-get-dataset-items?token=' + APIFY_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrls: [{ url }],
        maxCrawlPages: 1,
        proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
      }),
    });
    
    if (!resp.ok) return 'error';
    const items = await resp.json();
    
    if (!items || items.length === 0) return 'expired';
    
    const text = items[0]?.text || '';
    if (text.includes('This posting has expired') ||
        text.includes('This posting has been deleted') ||
        text.includes('This posting has been flagged')) {
      return 'expired';
    }
    
    return 'active';
  } catch {
    return 'error';
  }
}

export default async function handler(req: any, res: any) {
  // Verify auth — only allow with service key or admin
  const authHeader = req.headers['authorization'] || '';
  const cronSecret = req.headers["x-cron-secret"] || req.headers["authorization"]?.replace("Bearer ", "") || "";
  const expectedSecret = process.env.CRON_SECRET || '';
  const isVercelCron = req.headers["x-vercel-cron"] === "true" && expectedSecret === "";
  
  // Allow if: cron secret matches, or bearer token is service key
  if (!isVercelCron && cronSecret !== expectedSecret && authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    // Check if request is from admin user
    const token = authHeader.replace('Bearer ', '');
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();
        if (!profile?.is_admin) {
          return res.status(403).json({ error: 'Admin access required' });
        }
      } else {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    } else {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const result: CleanupResult = {
    aged_out: 0,
    checked: 0,
    expired: 0,
    still_active: 0,
    errors: 0,
  };

  try {
    // Step 1: Age-based cleanup — deactivate anything older than MAX_AGE_DAYS
    const { data: aged } = await supabase
      .from('listings')
      .update({ is_active: false })
      .eq('is_active', true)
      .lt('created_at', new Date(Date.now() - MAX_AGE_DAYS * 86400000).toISOString())
      .select('id');
    
    result.aged_out = aged?.length || 0;

    // Step 2: URL-check a batch of the oldest active listings
    const { data: toCheck } = await supabase
      .from('listings')
      .select('id, source_url, title')
      .eq('is_active', true)
      .not('source_url', 'is', null)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (toCheck && toCheck.length > 0) {
      for (const listing of toCheck) {
        result.checked++;
        const status = await checkUrlAlive(listing.source_url);
        
        if (status === 'expired') {
          await supabase
            .from('listings')
            .update({ is_active: false })
            .eq('id', listing.id);
          result.expired++;
        } else if (status === 'active') {
          result.still_active++;
        } else {
          result.errors++;
        }
        
        // Small delay between requests
        await new Promise(r => setTimeout(r, 500));
      }
    }

    return res.status(200).json({
      success: true,
      ...result,
      message: `Aged out: ${result.aged_out}, Checked: ${result.checked}, Expired: ${result.expired}, Active: ${result.still_active}, Errors: ${result.errors}`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Cleanup failed' });
  }
}
