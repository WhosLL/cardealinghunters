import { supabase } from './supabase';

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

// Known car makes (lowercase -> proper name)
const KNOWN_MAKES: Record<string, string> = {
  'toyota': 'Toyota', 'honda': 'Honda', 'ford': 'Ford',
  'chevrolet': 'Chevrolet', 'chevy': 'Chevrolet', 'bmw': 'BMW',
  'mercedes': 'Mercedes-Benz', 'mercedes-benz': 'Mercedes-Benz',
  'benz': 'Mercedes-Benz', 'audi': 'Audi', 'lexus': 'Lexus',
  'nissan': 'Nissan', 'hyundai': 'Hyundai', 'kia': 'Kia',
  'subaru': 'Subaru', 'mazda': 'Mazda', 'volkswagen': 'Volkswagen',
  'vw': 'Volkswagen', 'jeep': 'Jeep', 'ram': 'RAM', 'dodge': 'Dodge',
  'gmc': 'GMC', 'chrysler': 'Chrysler', 'buick': 'Buick',
  'cadillac': 'Cadillac', 'lincoln': 'Lincoln', 'acura': 'Acura',
  'infiniti': 'Infiniti', 'volvo': 'Volvo', 'porsche': 'Porsche',
  'tesla': 'Tesla', 'land rover': 'Land Rover', 'landrover': 'Land Rover',
  'mini': 'Mini', 'fiat': 'Fiat', 'mitsubishi': 'Mitsubishi',
  'pontiac': 'Pontiac', 'saturn': 'Saturn', 'scion': 'Scion',
  'genesis': 'Genesis', 'jaguar': 'Jaguar', 'alfa romeo': 'Alfa Romeo',
  'maserati': 'Maserati', 'bentley': 'Bentley',
  'ferrari': 'Ferrari', 'lamborghini': 'Lamborghini',
  'mclaren': 'McLaren'
};

// Common models per make for better extraction
const COMMON_MODELS: Record<string, string[]> = {
  'Toyota': ['Camry', 'Corolla', 'RAV4', 'Tacoma', 'Tundra', 'Highlander', 'Prius', '4Runner', 'Sienna', 'Avalon', 'Yaris', 'Supra', 'Land Cruiser', 'GR86'],
  'Honda': ['Civic', 'Accord', 'CR-V', 'Pilot', 'Odyssey', 'Fit', 'HR-V', 'Ridgeline', 'Element', 'S2000', 'Prelude', 'Insight', 'Passport'],
  'Ford': ['F-150', 'F150', 'Mustang', 'Explorer', 'Escape', 'Focus', 'Fusion', 'Ranger', 'Bronco', 'Edge', 'Expedition', 'Taurus', 'F-250', 'F250', 'F-350', 'Maverick'],
  'Chevrolet': ['Silverado', 'Camaro', 'Corvette', 'Malibu', 'Equinox', 'Tahoe', 'Suburban', 'Traverse', 'Impala', 'Cruze', 'Colorado', 'Blazer', 'Trax', 'Spark'],
  'BMW': ['3 Series', '5 Series', '7 Series', 'X3', 'X5', 'X1', 'X7', 'M3', 'M5', '328i', '335i', '528i', '535i', 'Z4', 'M4'],
  'Nissan': ['Altima', 'Sentra', 'Maxima', 'Rogue', 'Pathfinder', 'Frontier', 'Titan', 'Murano', 'Versa', '370Z', '350Z', 'Leaf', 'Kicks', 'Armada'],
  'Jeep': ['Wrangler', 'Cherokee', 'Grand Cherokee', 'Compass', 'Renegade', 'Gladiator', 'Liberty', 'Patriot'],
  'Dodge': ['Charger', 'Challenger', 'Durango', 'Journey', 'Grand Caravan', 'Dart', 'Viper', 'Neon'],
  'Hyundai': ['Elantra', 'Sonata', 'Tucson', 'Santa Fe', 'Kona', 'Palisade', 'Venue', 'Accent', 'Veloster'],
  'Kia': ['Forte', 'Optima', 'Sorento', 'Sportage', 'Soul', 'Telluride', 'Seltos', 'Rio', 'Stinger', 'K5'],
  'Subaru': ['Outback', 'Forester', 'Crosstrek', 'Impreza', 'WRX', 'Legacy', 'Ascent', 'BRZ'],
  'Tesla': ['Model 3', 'Model S', 'Model X', 'Model Y', 'Cybertruck'],
  'Mercedes-Benz': ['C-Class', 'E-Class', 'S-Class', 'GLC', 'GLE', 'A-Class', 'CLA', 'C300', 'E350', 'S550', 'AMG', 'G-Wagon', 'GLA'],
  'Volkswagen': ['Jetta', 'Passat', 'Golf', 'Tiguan', 'Atlas', 'Beetle', 'GTI', 'ID.4'],
  'Lexus': ['RX', 'ES', 'IS', 'NX', 'GX', 'LS', 'LC', 'UX', 'RX350', 'ES350', 'IS350'],
  'Mazda': ['Mazda3', 'Mazda6', 'CX-5', 'CX-9', 'CX-30', 'MX-5', 'Miata', 'CX-3', 'CX-50'],
  'GMC': ['Sierra', 'Terrain', 'Acadia', 'Yukon', 'Canyon', 'Envoy'],
  'RAM': ['1500', '2500', '3500', 'ProMaster'],
  'Cadillac': ['Escalade', 'CT5', 'CT4', 'XT5', 'XT4', 'XT6', 'CTS', 'ATS', 'SRX'],
  'Volvo': ['XC90', 'XC60', 'XC40', 'S60', 'S90', 'V60', 'V90'],
  'Acura': ['TLX', 'MDX', 'RDX', 'ILX', 'TSX', 'TL', 'RSX', 'Integra'],
  'Porsche': ['911', 'Cayenne', 'Macan', 'Panamera', 'Boxster', 'Cayman', 'Taycan'],
};

// --- Extraction helpers ---

function extractYear(title: string): number {
  const match = title.match(/\b(19[89]\d|20[0-2]\d)\b/);
  return match ? parseInt(match[0]) : 0;
}

function extractMake(title: string): string {
  const titleLower = title.toLowerCase();
  const multiWordMakes = ['land rover', 'alfa romeo', 'mercedes-benz'];
  for (const make of multiWordMakes) {
    if (titleLower.includes(make)) return KNOWN_MAKES[make];
  }
  const words = titleLower.split(/[\s,\-\/\|]+/);
  for (const word of words) {
    if (KNOWN_MAKES[word]) return KNOWN_MAKES[word];
  }
  if (titleLower.includes('mercedes')) return 'Mercedes-Benz';
  if (titleLower.includes('land rover')) return 'Land Rover';
  return 'Unknown';
}

function extractModel(title: string, make: string): string {
  if (make === 'Unknown') {
    const match = title.match(/\b(?:19|20)\d{2}\b\s+\S+\s+(\S+)/);
    return match ? match[1] : 'Unknown';
  }
  const models = COMMON_MODELS[make];
  if (models) {
    const titleLower = title.toLowerCase();
    const sorted = [...models].sort((a, b) => b.length - a.length);
    for (const model of sorted) {
      if (titleLower.includes(model.toLowerCase())) return model;
    }
  }
  const makeVariants = Object.entries(KNOWN_MAKES)
    .filter(([_, v]) => v === make)
    .map(([k]) => k);
  for (const variant of makeVariants) {
    const regex = new RegExp(variant.replace(/[-]/g, '[-\\s]?') + '\\s+(\\S+)', 'i');
    const match = title.match(regex);
    if (match && match[1]) {
      const candidate = match[1].replace(/[^a-zA-Z0-9\-]/g, '');
      if (candidate.length > 1 && !/^\d{4}$/.test(candidate)) return candidate;
    }
  }
  return 'Unknown';
}

function extractMileage(text: string): number {
  const patterns = [
    /(\d{1,3})[,.](\d{3})\s*(?:miles|mi\b)/i,
    /(\d{2,3})k\s*(?:miles|mi\b)/i,
    /(?:mileage|odometer|odo)[:\s]*(\d{1,3})[,.](\d{3})/i,
    /(?:mileage|odometer|odo)[:\s]*(\d{2,3})k/i,
    /(\d{1,3})[,.](\d{3})\s*(?:original|actual|highway|hwy)\s*(?:miles|mi)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      if (pattern.source.includes('k\\s')) {
        const val = parseInt(match[1]) * 1000;
        if (val >= 1000 && val < 500000) return val;
      } else if (match[2]) {
        const val = parseInt(match[1] + match[2]);
        if (val >= 1000 && val < 500000) return val;
      }
    }
  }
  return 0;
}

// --- Seller language analysis ---

interface SellerAnalysis {
  type: string;
  tags: string[];
}

function analyzeSellerLanguage(text: string): SellerAnalysis {
  const lc = text.toLowerCase();
  const tags: string[] = [];
  let dealerScore = 0;
  let privateScore = 0;

  for (const sig of DEALER_SIGNALS) {
    if (lc.includes(sig)) { dealerScore++; tags.push(sig); }
  }
  for (const sig of PRIVATE_SIGNALS) {
    if (lc.includes(sig)) { privateScore++; tags.push(sig); }
  }
  const urgencyTags: string[] = [];
  for (const sig of URGENCY_SIGNALS) {
    if (lc.includes(sig)) { urgencyTags.push(sig); }
  }

  let type = 'unknown';
  if (dealerScore > privateScore) type = 'dealer';
  else if (privateScore > 0) type = 'private';

  return { type, tags: [...tags, ...urgencyTags.map(u => `urgent:${u}`)] };
}

function buildEnrichedDescription(original: string, seller: SellerAnalysis): string {
  const badges: string[] = [];
  if (seller.type === 'dealer') badges.push('[DEALER]');
  else if (seller.type === 'private') badges.push('[PRIVATE]');
  const hasUrgency = seller.tags.some(t => t.startsWith('urgent:'));
  if (hasUrgency) badges.push('[MOTIVATED SELLER]');
  const prefix = badges.length > 0 ? badges.join(' ') + ' ' : '';
  const desc = original ? original.slice(0, 250) : '';
  return (prefix + desc).trim();
}

// --- Junk filtering ---

function isJunkListing(title: string, price: number, year: number, make: string): boolean {
  if (price < MIN_PRICE) return true;
  if (year === 0) return true;
  if (make === 'Unknown' && price < 3000) return true;
  const titleLower = title.toLowerCase();
  for (const kw of JUNK_KEYWORDS) {
    if (titleLower.includes(kw)) return true;
  }
  return false;
}

// --- Market value & deal scoring ---

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

// =============================================
// NEW: Direct Craigslist scraping (no Apify)
// =============================================

export async function scrapeCraigslist(searchUrl: string): Promise<any[]> {
  const response = await fetch(`/api/scrape-craigslist?searchUrl=${encodeURIComponent(searchUrl)}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Scrape failed' }));
    throw new Error(err.error || `Scrape failed: ${response.status}`);
  }
  const data = await response.json();
  return data.listings || [];
}

export async function processRawListings(rawListings: any[]): Promise<number> {
  let insertedCount = 0;

  for (const item of rawListings) {
    try {
      const title = item.title || '';
      const price = parseFloat(item.price) || 0;
      const year = extractYear(title);
      const make = extractMake(title);
      const model = extractModel(title, make);
      const fullText = `${title} ${item.description || ''}`;
      const mileage = extractMileage(fullText);
      const seller = analyzeSellerLanguage(fullText);

      if (isJunkListing(title, price, year, make)) continue;
      if (!title || title.length < 5) continue;

      const marketValue = calculateMarketValue(year, make, model);
      const dealScore = calculateDealScore(price, marketValue);

      // Deduplicate by source_url
      if (item.url) {
        const { data: existing } = await supabase
          .from('listings')
          .select('id')
          .eq('source_url', item.url)
          .limit(1);
        if (existing && existing.length > 0) continue;
      }

      const { error } = await supabase.from('listings').insert({
        title,
        year,
        make,
        model,
        price,
        mileage,
        location: item.location || 'Unknown',
        image_url: item.imageUrl || '',
        source_url: item.url || '',
        source: 'craigslist',
        description: buildEnrichedDescription(item.description || title, seller),
        market_value: marketValue,
        deal_score: dealScore,
        is_active: true,
        posted_at: new Date().toISOString(),
      });
      if (!error) insertedCount++;
    } catch (err) {
      console.error('Error processing item:', err);
    }
  }

  return insertedCount;
}

// =============================================
// LEGACY: Apify functions (kept for AdminPage)
// =============================================

const APIFY_TOKEN = import.meta.env.VITE_APIFY_TOKEN;

export const SCRAPERS = {
  craigslist: {
    actorId: 'viralanalyzer~craigslist-scraper',
    name: 'Craigslist',
    buildInput: (searchUrl: string) => {
      let city = 'losangeles';
      const cityMatch = searchUrl.match(/https?:\/\/([a-z]+)\.craigslist/);
      if (cityMatch) city = cityMatch[1];
      return { searchQueries: [''], city, category: 'cta', sort: 'date', maxResults: 100 };
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
        mileage,
        location: item.location || item.area || 'Unknown',
        image_url: item.imageUrl || item.image || '',
        source_url: item.url || item.link || '',
        source: 'craigslist' as const,
        description: buildEnrichedDescription(rawDesc, seller),
        posted_at: item.date || item.postedAt || new Date().toISOString(),
      };
    },
  },
} as const;

export type ScraperSource = keyof typeof SCRAPERS;

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
    throw new Error(`Failed to trigger scrape: ${response.status} ${errText}`);
  }
  const data = await response.json();
  await supabase.from('scrape_runs').insert({
    apify_run_id: data.data.id, source, search_url: searchUrl,
    status: 'running', listings_added: 0, started_at: new Date().toISOString(),
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
  datasetId: string, runId: string, searchUrl: string, source: ScraperSource
): Promise<number> {
  const scraper = SCRAPERS[source];
  const items = await getApifyDataset(datasetId);
  let insertedCount = 0;
  for (const item of items) {
    try {
      const normalized = scraper.normalizeItem(item);
      if (isJunkListing(normalized.title, normalized.price, extractYear(normalized.title), extractMake(normalized.title))) continue;
      if (normalized.title === 'Unknown Vehicle') continue;
      const marketValue = calculateMarketValue(normalized.year, normalized.make, normalized.model);
      const dealScore = calculateDealScore(normalized.price, marketValue);
      if (normalized.source_url) {
        const { data: existing } = await supabase.from('listings').select('id').eq('source_url', normalized.source_url).limit(1);
        if (existing && existing.length > 0) continue;
      }
      const { error } = await supabase.from('listings').insert({
        ...normalized, market_value: marketValue, deal_score: dealScore, is_active: true,
      });
      if (!error) insertedCount++;
    } catch (err) {
      console.error('Error processing item:', err);
    }
  }
  await supabase.from('scrape_runs').update({
    status: 'completed', listings_added: insertedCount, completed_at: new Date().toISOString(),
  }).eq('apify_run_id', runId);
  return insertedCount;
}

export function getScraperSources() {
  return [
    { id: 'craigslist' as ScraperSource, name: 'Craigslist', defaultUrl: 'https://losangeles.craigslist.org/search/cta' },
  ];
}
