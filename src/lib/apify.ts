import { calculateDealScore } from './dealScore';
import { supabase } from './supabase';
import { Listing } from '../types/index';

const APIFY_TOKEN = import.meta.env.VITE_APIFY_TOKEN;
const APIFY_ACTOR_ID = 'jjzQxiI86NTYliq3t';

export async function triggerApifyScrape(searchUrl: string): Promise<string> {
  const response = await fetch(`https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${APIFY_TOKEN}`,
    },
    body: JSON.stringify({
      searchUrls: [searchUrl],
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to trigger Apify scrape: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data.id;
}

export async function getApifyRunStatus(runId: string): Promise<any> {
  const response = await fetch(`https://api.apify.com/v2/runs/${runId}`, {
    headers: {
      'Authorization': `Bearer ${APIFY_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get Apify run status: ${response.statusText}`);
  }

  return response.json();
}

export async function getApifyDataset(datasetId: string): Promise<any[]> {
  const response = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items`,
    {
      headers: {
        'Authorization': `Bearer ${APIFY_TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get Apify dataset: ${response.statusText}`);
  }

  return response.json();
}

export async function processAndInsertListings(
  datasetId: string,
  runId: string,
  searchUrl: string,
  source: string
): Promise<number> {
  const items = await getApifyDataset(datasetId);
  let insertedCount = 0;

  for (const item of items) {
    const listing = {
      title: item.title || `${item.year} ${item.make} ${item.model}`,
      year: parseInt(item.year) || new Date().getFullYear(),
      make: item.make || 'Unknown',
      model: item.model || 'Unknown',
      price: parseFloat(item.price) || 0,
      mileage: parseFloat(item.odometer) || 0,
      location: item.location || 'Unknown',
      image_url: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400',
      source_url: item.url || '',
      source: source,
      market_value: calculateMarketValue(
        parseInt(item.year) || new Date().getFullYear(),
        item.make || 'Unknown',
        item.model || 'Unknown'
      ),
      description: item.description || '',
      posted_at: item.postedAt || new Date().toISOString(),
      is_active: true,
    };

    const dealScore = calculateDealScore(listing.price, listing.market_value);

    const { error } = await supabase
      .from('listings')
      .insert({
        ...listing,
        deal_score: dealScore,
      });

    if (!error) {
      insertedCount++;
    }
  }

  // Update scrape_runs table
  await supabase
    .from('scrape_runs')
    .update({
      status: 'completed',
      listings_added: insertedCount,
      completed_at: new Date().toISOString(),
    })
    .eq('apify_run_id', runId);

  return insertedCount;
}

function calculateMarketValue(year: number, make: string, model: string): number {
  // Simplified market value estimation based on year and make
  const currentYear = new Date().getFullYear();
  const age = currentYear - year;
  let baseValue = 15000;

  // Adjust for premium makes
  const premiumMakes: Record<string, number> = {
    'BMW': 25000,
    'Mercedes': 28000,
    'Audi': 24000,
    'Lexus': 22000,
    'Porsche': 35000,
  };

  if (make in premiumMakes) {
    baseValue = premiumMakes[make];
  }

  // Depreciation: 15% per year
  const depreciation = 1 - (age * 0.15);
  return Math.max(2000, Math.round(baseValue * Math.max(0.2, depreciation)));
}
