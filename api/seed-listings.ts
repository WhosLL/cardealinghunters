import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

function calcMarketValue(year: number, make: string): number {
  const age = 2026 - year;
  const bases: { [key: string]: number } = {
    'Toyota': 20000,
    'Honda': 18000,
    'Ford': 22000,
    'BMW': 30000,
    'Tesla': 35000,
    'Jeep': 25000,
    'Chevrolet': 20000,
    'Nissan': 17000,
    'Hyundai': 16000,
    'Kia': 17000,
    'Mazda': 18000,
    'Subaru': 19000,
    'Volkswagen': 19000,
    'Lexus': 28000,
    'Audi': 32000,
  };
  const base = bases[make] || 18000;
  return Math.max(3000, Math.round(base * Math.max(0.15, 1 - age * 0.12)));
}

function calcDealScore(price: number, mv: number): string {
  const r = price / mv;
  if (r < 0.85) return 'great';
  if (r < 0.95) return 'good';
  if (r <= 1.05) return 'fair';
  return 'overpriced';
}

const UNSPLASH_PHOTOS = [
  'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600',
  'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=600',
  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600',
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600',
  'https://images.unsplash.com/photo-1542362567-b07e54358753?w=600',
  'https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=600',
  'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=600',
  'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=600',
  'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=600',
  'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600',
  'https://images.unsplash.com/photo-1619682817481-e994891cd1f5?w=600',
  'https://images.unsplash.com/photo-1616422285623-13ff0162193c?w=600',
  'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=600',
  'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=600',
  'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600',
];

const LISTINGS_DATA = [
  { title: '2021 Toyota Camry SE', year: 2021, make: 'Toyota', model: 'Camry SE', price: 18500, mileage: 32000, location: 'Los Angeles, CA', description: 'Well-maintained sedan, single owner, full service history. Clean title. Excellent condition.' },
  { title: '2019 Honda Civic Sport', year: 2019, make: 'Honda', model: 'Civic Sport', price: 15900, mileage: 45000, location: 'San Francisco, CA', description: 'Reliable daily driver, minor cosmetic wear. New tires. Perfect for commuting.' },
  { title: '2022 Ford Mustang GT', year: 2022, make: 'Ford', model: 'Mustang GT', price: 34000, mileage: 12000, location: 'Phoenix, AZ', description: 'Performance car, low mileage, dealer maintained. Warranty remaining.' },
  { title: '2018 BMW 3 Series 330i', year: 2018, make: 'BMW', model: '3 Series 330i', price: 22500, mileage: 58000, location: 'San Diego, CA', description: 'Luxury sedan, recent service, leather interior. Panoramic sunroof.' },
  { title: '2020 Tesla Model 3', year: 2020, make: 'Tesla', model: 'Model 3', price: 28900, mileage: 35000, location: 'Seattle, WA', description: 'Electric range ~250 miles, autopilot, supercharger access. Clean energy.' },
  { title: '2023 Jeep Wrangler Rubicon', year: 2023, make: 'Jeep', model: 'Wrangler Rubicon', price: 42000, mileage: 8000, location: 'Denver, CO', description: 'Off-road ready, removable doors, 4WD. Like new condition.' },
  { title: '2020 Chevrolet Silverado 1500', year: 2020, make: 'Chevrolet', model: 'Silverado 1500', price: 26500, mileage: 42000, location: 'Austin, TX', description: 'Crew cab, towing package, runs strong. Recent transmission service.' },
  { title: '2019 Nissan Altima', year: 2019, make: 'Nissan', model: 'Altima', price: 14200, mileage: 51000, location: 'Chicago, IL', description: 'Fuel efficient, comfortable, well-kept interior. All fluids serviced.' },
  { title: '2021 Hyundai Elantra N', year: 2021, make: 'Hyundai', model: 'Elantra N', price: 17800, mileage: 28000, location: 'Miami, FL', description: 'Sporty compact, good fuel economy, warranty transferable.' },
  { title: '2022 Kia Sorento', year: 2022, make: 'Kia', model: 'Sorento', price: 24500, mileage: 19000, location: 'Portland, OR', description: '3-row SUV, all-wheel drive, family-friendly. Excellent reliability rating.' },
  { title: '2019 Mazda CX-5', year: 2019, make: 'Mazda', model: 'CX-5', price: 19800, mileage: 47000, location: 'Los Angeles, CA', description: 'Crossover SUV, leather seats, navigation system. Low accident history.' },
  { title: '2020 Subaru Outback', year: 2020, make: 'Subaru', model: 'Outback', price: 21300, mileage: 41000, location: 'Seattle, WA', description: 'AWD wagon, great for outdoor adventures. Excellent safety ratings.' },
  { title: '2018 Volkswagen Jetta', year: 2018, make: 'Volkswagen', model: 'Jetta', price: 13500, mileage: 62000, location: 'San Diego, CA', description: 'Reliable European sedan, regular maintenance, clean carfax.' },
  { title: '2021 Lexus UX 250h', year: 2021, make: 'Lexus', model: 'UX 250h', price: 27500, mileage: 25000, location: 'Phoenix, AZ', description: 'Hybrid luxury compact, premium interior, excellent fuel economy.' },
  { title: '2019 Audi A4', year: 2019, make: 'Audi', model: 'A4', price: 26700, mileage: 54000, location: 'San Francisco, CA', description: 'Premium German sedan, Quattro AWD, sport suspension.' },
  { title: '2022 Honda CR-V', year: 2022, make: 'Honda', model: 'CR-V', price: 28400, mileage: 15000, location: 'Denver, CO', description: 'Popular SUV, spacious cargo, Honda reliability. Nearly brand new.' },
  { title: '2020 Toyota Highlander', year: 2020, make: 'Toyota', model: 'Highlander', price: 32100, mileage: 38000, location: 'Austin, TX', description: '3-row family SUV, all-wheel drive, excellent condition.' },
  { title: '2019 Ford F-150', year: 2019, make: 'Ford', model: 'F-150', price: 25800, mileage: 55000, location: 'Chicago, IL', description: 'Super crew cab, 4WD, towing package. Well-maintained truck.' },
  { title: '2021 Chevrolet Equinox', year: 2021, make: 'Chevrolet', model: 'Equinox', price: 22900, mileage: 29000, location: 'Miami, FL', description: 'Reliable crossover, good storage, excellent fuel efficiency.' },
  { title: '2018 Nissan Qashqai', year: 2018, make: 'Nissan', model: 'Qashqai', price: 16700, mileage: 59000, location: 'Portland, OR', description: 'Compact crossover, AWD, reliable Nissan powertrain.' },
  { title: '2020 Kia Sportage', year: 2020, make: 'Kia', model: 'Sportage', price: 21400, mileage: 36000, location: 'Los Angeles, CA', description: 'Compact SUV, good handling, warranty still available.' },
  { title: '2019 Mazda Mazda3', year: 2019, make: 'Mazda', model: 'Mazda3', price: 16900, mileage: 48000, location: 'San Francisco, CA', description: 'Fun-to-drive hatchback, premium audio system, clean interior.' },
  { title: '2021 Subaru Forester', year: 2021, make: 'Subaru', model: 'Forester', price: 24700, mileage: 23000, location: 'Seattle, WA', description: 'Compact SUV, standard AWD, excellent safety features.' },
  { title: '2022 Volkswagen Golf GTI', year: 2022, make: 'Volkswagen', model: 'Golf GTI', price: 28900, mileage: 11000, location: 'San Diego, CA', description: 'Performance hatchback, turbocharged, sport suspension.' },
  { title: '2020 Lexus RX 350', year: 2020, make: 'Lexus', model: 'RX 350', price: 38500, mileage: 42000, location: 'Phoenix, AZ', description: 'Luxury crossover, premium leather, navigation, smooth ride.' },
  { title: '2019 Audi Q5', year: 2019, make: 'Audi', model: 'Q5', price: 31200, mileage: 51000, location: 'Denver, CO', description: 'Luxury compact SUV, Quattro AWD, premium features.' },
  { title: '2021 Toyota RAV4 Prime', year: 2021, make: 'Toyota', model: 'RAV4 Prime', price: 36800, mileage: 22000, location: 'Austin, TX', description: 'Plugin hybrid, excellent fuel economy, tech-forward.' },
  { title: '2020 Honda Odyssey', year: 2020, make: 'Honda', model: 'Odyssey', price: 27600, mileage: 44000, location: 'Chicago, IL', description: 'Family minivan, sliding doors, spacious interior, reliable.' },
  { title: '2019 Ford Explorer', year: 2019, make: 'Ford', model: 'Explorer', price: 29300, mileage: 56000, location: 'Miami, FL', description: '3-row SUV, strong engine, towing ready.' },
  { title: '2022 Chevrolet Bolt EV', year: 2022, make: 'Chevrolet', model: 'Bolt EV', price: 26400, mileage: 9000, location: 'Portland, OR', description: 'Electric vehicle, 250+ mile range, affordable EV option.' },
  { title: '2021 Nissan Rogue', year: 2021, make: 'Nissan', model: 'Rogue', price: 23100, mileage: 31000, location: 'Los Angeles, CA', description: 'Compact SUV, CVT transmission, comfortable for families.' },
  { title: '2020 Kia Optima', year: 2020, make: 'Kia', model: 'Optima', price: 18900, mileage: 43000, location: 'San Francisco, CA', description: 'Midsize sedan, turbocharged option, excellent warranty.' },
  { title: '2019 Mazda CX-9', year: 2019, make: 'Mazda', model: 'CX-9', price: 27200, mileage: 52000, location: 'Seattle, WA', description: '3-row luxury crossover, premium interior, good handling.' },
  { title: '2021 Subaru Ascent', year: 2021, make: 'Subaru', model: 'Ascent', price: 33400, mileage: 26000, location: 'San Diego, CA', description: '3-row SUV, standard AWD, excellent safety, family-friendly.' },
  { title: '2020 Volkswagen Passat', year: 2020, make: 'Volkswagen', model: 'Passat', price: 19700, mileage: 48000, location: 'Phoenix, AZ', description: 'Midsize sedan, German engineering, comfortable and reliable.' },
  { title: '2021 Lexus NX 300', year: 2021, make: 'Lexus', model: 'NX 300', price: 32700, mileage: 24000, location: 'Denver, CO', description: 'Compact luxury SUV, premium features, excellent reliability.' },
  { title: '2018 Audi A6', year: 2018, make: 'Audi', model: 'A6', price: 28400, mileage: 59000, location: 'Austin, TX', description: 'Premium midsize sedan, Quattro AWD, luxury features.' },
  { title: '2022 Toyota GR Corolla', year: 2022, make: 'Toyota', model: 'GR Corolla', price: 31500, mileage: 7000, location: 'Chicago, IL', description: 'High-performance compact, turbocharged, track-ready.' },
  { title: '2020 Honda Accord', year: 2020, make: 'Honda', model: 'Accord', price: 24300, mileage: 39000, location: 'Miami, FL', description: 'Midsize sedan, excellent fuel economy, Honda reliability.' },
];

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Clear existing listings
    const { error: deleteError } = await supabase
      .from('listings')
      .delete()
      .eq('is_active', true);

    if (deleteError) throw deleteError;

    // Prepare listings with market values and deal scores
    const listingsToInsert = LISTINGS_DATA.map((listing, idx) => {
      const marketValue = calcMarketValue(listing.year, listing.make);
      const dealScore = calcDealScore(listing.price, marketValue);
      const photoUrl = UNSPLASH_PHOTOS[idx % UNSPLASH_PHOTOS.length];
      const craigslistUrl = `https://losangeles.craigslist.org/search/cta?query=${listing.make}+${listing.model}`;

      return {
        title: listing.title,
        year: listing.year,
        make: listing.make,
        model: listing.model,
        price: listing.price,
        mileage: listing.mileage,
        location: listing.location,
        image_url: photoUrl,
        source_url: craigslistUrl,
        source: 'craigslist',
        description: listing.description,
        market_value: marketValue,
        deal_score: dealScore,
        is_active: true,
        posted_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      };
    });

    // Insert listings
    const { error: insertError, data } = await supabase
      .from('listings')
      .insert(listingsToInsert)
      .select();

    if (insertError) throw insertError;

    return res.status(200).json({
      success: true,
      message: `Successfully seeded ${data?.length || 0} listings`,
      count: data?.length || 0,
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to seed listings',
    });
  }
}
