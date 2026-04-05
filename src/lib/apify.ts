import { supabase } from './supabase';

const APIFY_TOKEN = import.meta.env.VITE_APIFY_TOKEN;

// Scraper configurations for each source
export const SCRAPERS = {
  craigslist: {
    actorId: 'viralanalyzer~craigslist-scraper',
    name: 'Craigslist',
    buildInput: (searchUrl: string) => {
      // Parse city from URL or use default
      let city = 'losangeles';
      const cityMatch = searchUrl.match(/https?:\/\/([a-z]+)\.craigslist/);
      if (cityMatch) city = cityMatch[1];
      // Parse search query from URL or use default
      let query = searchUrl;
      if (searchUrl.includes('craigslist.org')) {
        query = 'car truck';
      }
      return {
        searchQueries: [query],
        city: city,
        category: 'sss',
        sort: 'date',
        maxResults: 30,
      };
    },
    defaultUrl: 'https://losangeles.craigslist.org/search/cta',
    normalizeItem: (item: any) => ({
      title: item.title || 'Unknown Vehicle',
      year: extractYear(item.title || ''),
      make: extractMake(item.title || ''),
      model: extractModel(item.title || ''),
      price: parseFloat(String(item.price || item.numericPrice || '0').replace(/[^0-9.]/g, '')) || 0,
      mileage: 0,
      location: item.location || item.area || 'Unknown',
      image_url: item.imageUrl || item.image || '',
      source_url: item.url || item.link || '',
      source: 'craigslist' as const,
      description: item.title || '',
      posted_at: item.date || item.postedAt || new Date().toISOString(),
    }),
  },
  autotrader: {
    actorId: 'epctex~autotrader-scraper',
    name: 'AutoTrader',
    buildInput: (searchUrl: string) => ({
      startUrls: [searchUrl],
      endPage: 3,
      maxItems: 50,
      proxy: { useApifyProxy: true, countryCode: 'US' },
    }),
    defaultUrl: 'https://www.autotrader.com/cars-for-sale/all-cars/los-angeles-ca-90001?searchRadius=50',
    normalizeItem: (item: any) => ({
      title: item.title || `${item.year || ''} ${item.brand || item.make || ''} ${item.model || ''}`.trim() || 'Unknown Vehicle',
      year: parseInt(item.year) || new Date().getFullYear(),
      make: item.brand || item.make || 'Unknown',
      model: item.model || 'Unknown',
      price: parseFloat(String(item.price).replace(/[^0-9.]/g, '')) || 0,
      mileage: parseFloat(String(item.mileage || '0').replace(/[^0-9]/g, '')) || 0,
      location: item.ownerTitle || 'Unknown',
      image_url: item.images?.[0] || '',
      source_url: item.url || '',
      source: 'autotrader' as const,
      description: item.features ? Object.values(item.features).flat().slice(0, 5).join(', ') : '',
      posted_at: new Date().toISOString(),
    }),
  },
  carscom: {
    actorId: 'voyn~cars-scraper',
    name: 'Cars.com',
    buildInput: (searchUrl: string) => ({
      list_url: [searchUrl],
    }),
    defaultUrl: 'https://www.cars.com/shopping/results/?stock_type=used&makes[]=&maximum_distance=50&zip=90001&sort=listed_at_desc',
    normalizeItem: (item: any) => ({
      title: item.name || `${item.year || ''} ${item.make || ''} ${item.model || ''}`.trim() || 'Unknown Vehicle',
      year: parseInt(item.year) || new Date().getFullYear(),
      make: item.make || 'Unknown',
      model: item.model || 'Unknown',
      price: parseFloat(String(item.price).replace(/[^0-9.]/g, '')) || 0,
      mileage: parseFloat(String(item.mileage || '0').replace(/[^0-9]/g, '')) || 0,
      location: 'Cars.com Listing',
      image_url: (item.images || []).find((img: string) => img) || '',
      source_url: item.record_url || item.url || '',
      source: 'carscom' as const,
      description: (item.features || []).slice(0, 5).join(', '),
      posted_at: new Date().toISOString(),
    }),
  },
} as const;

export type ScraperSource = keyof typeof SCRAPERS;

function extractYear(title: string): number {
  const match = title.match(/\b(19|20)\d{2}\b/);
  return match ? parseInt(match[0]) : new Date().getFullYear();
}

function extractMake(title: string): string {
  const knownMakes = ['Toyota', 'Honda', 'Ford', 'Chevrolet', 'Chevy', 'BMW', 'Mercedes', 'Audi', 'Lexus', 'Nissan', 'Hyundai', 'Kia', 'Subaru', 'Mazda', 'Volkswagen', 'VW', 'Jeep', 'RAM', 'Dodge', 'GMC', 'Chrysler', 'Buick', 'Cadillac', 'Lincoln', 'Acura', 'Infiniti', 'Volvo', 'Porsche', 'Tesla', 'Land Rover', 'Mini', 'Fiat', 'Mitsubishi'];
  const titleLower = title.toLowerCase();
  for (const make of knownMakes) {
    if (titleLower.includes(make.toLowerCase())) return make;
  }
  return 'Unknown';
}

function extractModel(title: string): string {
  const words = title.split(/\s+/);
  if (words.length >= 3) {
    const startIdx = /^\d{4}$/.test(words[0]) ? 2 : 1;
    if (words[startIdx]) return words[startIdx];
  }
  return 'Unknown';
}

export async function triggerApifyScrape(searchUrl: string, source: ScraperSource = 'craigslist'): Promise<string> {
  const scraper = SCRAPERS[source];
  const input = scraper.buildInput(searchUrl);

  const response = await fetch(`https://api.apify.com/v2/acts/${scraper.actorId}/runs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${APIFY_TOKEN}`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to trigger ${scraper.name} scrape: ${response.status} ${errText}`);
  }

  const data = await response.json();

  await supabase.from('scrape_runs').insert({
    apify_run_id: data.data.id,
    source: source,
    search_url: searchUrl,
    status: 'running',
    listings_added: 0,
    started_at: new Date().toISOString(),
  });

  return data.data.id;
}

export async function getApifyRunStatus(runId: string): Promise<any> {
  const response = await fetch(`https://api.apify.com/v2/runs/${runId}`, {
    headers: { 'Authorization': `Bearer ${APIFY_TOKEN}` },
  });
  if (!response.ok) throw new Error(`Failed to get run status: ${response.statusText}`);
  return response.json();
}

export async function getApifyDataset(datasetId: string): Promise<any[]> {
  const response = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items`, {
    headers: { 'Authorization': `Bearer ${APIFY_TOKEN}` },
  });
  if (!response.ok) throw new Error(`Failed to get dataset: ${response.statusText}`);
  return response.json();
}

export async function processAndInsertListings(
  datasetId: string,
  runId: string,
  searchUrl: string,
  source: ScraperSource
): Promise<number> {
  const scraper = SCRAPERS[source];
  const items = await getApifyDataset(datasetId);

  let insertedCount = 0;

  for (const item of items) {
    try {
      const normalized = scraper.normalizeItem(item);

      if (!normalized.price || normalized.price <= 0) continue;
      if (normalized.title === 'Unknown Vehicle') continue;

      const marketValue = calculateMarketValue(normalized.year, normalized.make, normalized.model);
      const dealScore = calculateDealScore(normalized.price, marketValue);

      if (normalized.source_url) {
        const { data: existing } = await supabase
          .from('listings')
          .select('id')
          .eq('source_url', normalized.source_url)
          .limit(1);
        if (existing && existing.length > 0) continue;
      }

      const { error } = await supabase.from('listings').insert({
        ...normalized,
        market_value: marketValue,
        deal_score: dealScore,
        is_active: true,
      });

      if (!error) insertedCount++;
    } catch (err) {
      console.error('Error processing item:', err);
    }
  }

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

function calculateDealScore(price: number, marketValue: number): string {
  if (marketValue <= 0) return 'fair';
  const ratio = price / marketValue;
  if (ratio < 0.85) return 'great';
  if (ratio < 0.95) return 'good';
  if (ratio <= 1.05) return 'fair';
  return 'overpriced';
}

function calculateMarketValue(year: number, make: string, model: string): number {
  const currentYear = new Date().getFullYear();
  const age = currentYear - year;

  const premiumMakes: Record<string, number> = {
    'BMW': 30000, 'Mercedes': 32000, 'Mercedes-Benz': 32000,
    'Audi': 28000, 'Lexus': 26000, 'Porsche': 45000,
    'Tesla': 35000, 'Land Rover': 35000, 'Toyota': 20000,
    'Honda': 18000, 'Ford': 22000, 'Chevrolet': 20000,
    'Jeep': 24000, 'RAM': 28000, 'GMC': 26000,
    'Subaru': 20000, 'Mazda': 18000, 'Hyundai': 17000,
    'Kia': 17000, 'Nissan': 17000, 'Volkswagen': 19000,
    'Volvo': 24000, 'Acura': 22000, 'Infiniti': 22000,
    'Cadillac': 28000, 'Lincoln': 26000, 'Dodge': 22000,
    'Chrysler': 18000,
  };

  let baseValue = premiumMakes[make] || 18000;
  const depreciation = 1 - (age * 0.12);
  return Math.max(3000, Math.round(baseValue * Math.max(0.15, depreciation)));
}

export function getScraperSources() {
  return Object.entries(SCRAPERS).map(([key, val]) => ({
    id: key as ScraperSource,
    name: val.name,
    defaultUrl: val.defaultUrl,
  }));
}
