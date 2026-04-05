import { supabase } from './supabase';

const APIFY_TOKEN = import.meta.env.VITE_APIFY_TOKEN;

// Junk listing keywords - titles containing these get filtered out
const JUNK_KEYWORDS = [
  'parts', 'parting out', 'parting', 'engine only', 'transmission only',
  'wheels only', 'tires only', 'rims only', 'bumper', 'hood only',
  'door only', 'fender', 'headlight', 'taillight', 'catalytic',
  'floor mat', 'car cover', 'roof rack', 'bike rack', 'trailer hitch',
  'tool box', 'jack stand', 'jumper cable', 'dash cam',
  'wanted', 'looking for', 'iso ', 'wtb ', 'need a car',
  'scrap', 'junk car', 'cash for'
];

const MIN_PRICE = 1000;

// Seller language detection patterns
const DEALER_SIGNALS = [
  'dealer', 'dealership', 'auto sales', 'motors inc', 'automotive',
  'certified pre-owned', 'cpo', 'warranty included', 'financing available',
  'we finance', 'call us', 'visit us', 'come see', 'our lot',
  'inventory', 'stock #', 'stock number', 'vin:'
];

const URGENCY_SIGNALS = [
  'must sell', 'must go', 'need gone', 'obo', 'or best offer',
  'best offer', 'motivated seller', 'desperate', 'moving sale',
  'relocating', 'priced to sell', 'fire sale', 'quick sale',
  'price drop', 'reduced', 'lowered price', 'negotiable',
  'make offer', 'send offers', 'cash only', 'first come',
  'wont last', "won't last", 'act fast', 'below market',
  'below book', 'steal', 'giving away'
];

const PRIVATE_SIGNALS = [
  'private party', 'private seller', 'by owner', 'personal vehicle',
  'my car', 'i am selling', 'im selling', "i'm selling",
  'daily driver', 'family car', 'commuter car', 'second owner',
  'one owner', '1 owner', 'single owner', 'clean title',
  'salvage title', 'rebuilt title', 'no dealer'
];
: number, make: string): boolean {
  if (price < MIN_PRICE) return true;
  if (year === 0) return true;
  if (make === 'Unknown' && price < 3000) return true;
  const titleLower = title.toLowerCase();
  for (const kw of JUNK_KEYWORDS) {
    if (titleLower.includes(kw)) return true;
  }
  return false;
}

// --- Scraper configurations ---

export const SCRAPERS = {
  craigslist: {
    actorId: 'viralanalyzer~craigslist-scraper',
    name: 'Craigslist',
    buildInput: (searchUrl: string) => {
      let city = 'losangeles';
      const cityMatch = searchUrl.match(/https?:\/\/([a-z]+)\.craigslist/);
      if (cityMatch) city = cityMatch[1];
      return {
        searchQueries: [''],
        city: city,
        category: 'cta',
        sort: 'date',
        maxResults: 100,
      };
    },
    defaultUrl: 'https://losangeles.craigslist.org/search/cta',
    normalizeItem: (item: any) => {
      const title = item.title || '';
      const rawDesc = item.description || item.body || item.title || '';
      const fullText = `${title} ${rawDesc}`;
      const mileage = extractMileage(fullText);
      const seller = analyzeSellerLanguage(fullText);
      return {
        title: title || 'Unknown Vehicle',
        year: extractYear(title),
        make: extractMake(title),
        model: extractModel(title, extractMake(title)),
        price: parseFloat(String(item.price || item.numericPrice || '0').replace(/[^0-9.]/g, '')) || 0,
        mileage: mileage,
        location: item.location || item.area || 'Unknown',
        image_url: item.imageUrl || item.image || '',
        source_url: item.url || item.link || '',
        source: 'craigslist' as const,
        description: buildEnrichedDescription(rawDesc, seller),
        posted_at: item.date || item.postedAt || new Date().toISOString(),
      };
    },
  },
  autotrader: {
    actorId: 'epctex~autotrader-scraper',
    name: 'AutoTrader',
    buildInput: (searchUrl: string) => ({
      startUrls: [searchUrl],
      endPage: 3,
      maxItems: 100,
      proxy: { useApifyProxy: true, countryCode: 'US' },
    }),
    defaultUrl: 'https://www.autotrader.com/cars-for-sale/all-cars/los-angeles-ca-90001?searchRadius=50',
    normalizeItem: (item: any) => {
      const title = item.title || `${item.year || ''} ${item.brand || item.make || ''} ${item.model || ''}`.trim() || 'Unknown Vehicle';
      const rawDesc = item.features ? Object.values(item.features).flat().slice(0, 5).join(', ') : '';
      const fullText = `${title} ${rawDesc} ${item.sellerName || ''}`;
      const seller = analyzeSellerLanguage(fullText);
      if (seller.type === 'unknown') seller.type = 'dealer';
      return {
        title,
        year: parseInt(item.year) || new Date().getFullYear(),
        make: item.brand || item.make || extractMake(title),
        model: item.model || extractModel(title, item.brand || item.make || extractMake(title)),
        price: parseFloat(String(item.price).replace(/[^0-9.]/g, '')) || 0,
        mileage: parseFloat(String(item.mileage || '0').replace(/[^0-9]/g, '')) || 0,
        location: item.ownerTitle || 'Unknown',
        image_url: item.images?.[0] || '',
        source_url: item.url || '',
        source: 'autotrader' as const,
        description: buildEnrichedDescription(rawDesc, seller),
        posted_at: new Date().toISOString(),
      };
    },
  },
  carscom: {
    actorId: 'voyn~cars-scraper',
    name: 'Cars.com',
    buildInput: (searchUrl: string) => ({
      list_url: [searchUrl],
    }),
    defaultUrl: 'https://www.cars.com/shopping/results/?stock_type=used&makes[]=&maximum_distance=50&zip=90001&sort=listed_at_desc',
    normalizeItem: (item: any) => {
      const title = item.name || `${item.year || ''} ${item.make || ''} ${item.model || ''}`.trim() || 'Unknown Vehicle';
      const rawDesc = (item.features || []).slice(0, 5).join(', ');
      const fullText = `${title} ${rawDesc} ${item.dealer_name || ''}`;
      const seller = analyzeSellerLanguage(fullText);
      return {
        title,
        year: parseInt(item.year) || new Date().getFullYear(),
        make: item.make || extractMake(title),
        model: item.model || extractModel(title, item.make || extractMake(title)),
        price: parseFloat(String(item.price).replace(/[^0-9.]/g, '')) || 0,
        mileage: parseFloat(String(item.mileage || '0').replace(/[^0-9]/g, '')) || 0,
        location: 'Cars.com Listing',
        image_url: (item.images || []).find((img: string) => img) || '',
        source_url: item.record_url || item.url || '',
        source: 'carscom' as const,
        description: buildEnrichedDescription(rawDesc, seller),
        posted_at: new Date().toISOString(),
      };
    },
  },
} as const;

export type ScraperSource = keyof typeof SCRAPERS;

// --- API functions ---

export async function triggerApifyScrape(searchUrl: string, source: ScraperSource = 'craigslist'): Promise<string> {
  const scraper = SCRAPERS[source];
  const input = scraper.buildInput(searchUrl);
  const response = await fetch(`https://api.apify.com/v2/acts/${scraper.actorId}/runs?token=${APIFY_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  const response = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`);
  if (!response.ok) throw new Error(`Failed to get run status: ${response.statusText}`);
  return response.json();
}

export async function getApifyDataset(datasetId: string): Promise<any[]> {
  const response = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`);
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

      // Filter junk
      if (isJunkListing(normalized.title, normalized.price, extractYear(normalized.title), extractMake(normalized.title))) continue;
      if (normalized.title === 'Unknown Vehicle') continue;

      const marketValue = calculateMarketValue(normalized.year, normalized.make, normalized.model);
      const dealScore = calculateDealScore(normalized.price, marketValue);

      // Deduplicate by source_url
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

function calculateMarketValue(year: number, make: string, _model: string): number {
  const currentYear = new Date().getFullYear();
  const age = currentYear - year;
  if (age < 0 || age > 40) return 5000;

  const premiumMakes: Record<string, number> = {
    'BMW': 30000, 'Mercedes-Benz': 32000, 'Audi': 28000, 'Lexus': 26000,
    'Porsche': 45000, 'Tesla': 35000, 'Land Rover': 35000,
    'Toyota': 20000, 'Honda': 18000, 'Ford': 22000, 'Chevrolet': 20000,
    'Jeep': 24000, 'RAM': 28000, 'GMC': 26000, 'Subaru': 20000,
    'Mazda': 18000, 'Hyundai': 17000, 'Kia': 17000, 'Nissan': 17000,
    'Volkswagen': 19000, 'Volvo': 24000, 'Acura': 22000, 'Infiniti': 22000,
    'Cadillac': 28000, 'Lincoln': 26000, 'Dodge': 22000, 'Chrysler': 18000,
    'Mini': 18000, 'Fiat': 14000, 'Mitsubishi': 16000,
  };

  const baseValue = premiumMakes[make] || 18000;
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
