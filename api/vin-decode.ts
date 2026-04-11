// api/vin-decode.ts
// Decodes a VIN using the free NHTSA vPIC API
// Returns: make, model, year, trim, engine, drivetrain, body type, fuel type
//
// GET /api/vin-decode?vin=1HGBH41JXMN109186

const ALLOWED_ORIGINS = [
  'https://cardealinghunters.vercel.app',
  'http://localhost:5173',
];

function setCorsHeaders(req: any, res: any) {
  const origin = req.headers?.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

interface VinResult {
  vin: string;
  make: string;
  model: string;
  year: number;
  trim: string;
  engine: string;
  displacement: string;
  cylinders: string;
  drivetrain: string;
  bodyType: string;
  fuelType: string;
  transmission: string;
  doors: string;
  plantCountry: string;
  vehicleType: string;
  errorCode: string;
  errorText: string;
}

const FIELD_MAP: Record<string, keyof VinResult> = {
  'Make': 'make',
  'Model': 'model',
  'Model Year': 'year' as any,
  'Trim': 'trim',
  'Engine Model': 'engine',
  'Displacement (L)': 'displacement',
  'Engine Number of Cylinders': 'cylinders',
  'Drive Type': 'drivetrain',
  'Body Class': 'bodyType',
  'Fuel Type - Primary': 'fuelType',
  'Transmission Style': 'transmission',
  'Doors': 'doors',
  'Plant Country': 'plantCountry',
  'Vehicle Type': 'vehicleType',
  'Error Code': 'errorCode',
  'Error Text': 'errorText',
};

export default async function handler(req: any, res: any) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const vin = (req.query.vin as string || '').trim().toUpperCase();
  if (!vin || vin.length !== 17) {
    return res.status(400).json({ error: 'VIN must be exactly 17 characters' });
  }

  // Validate VIN format (no I, O, Q)
  if (/[IOQ]/.test(vin)) {
    return res.status(400).json({ error: 'VIN contains invalid characters (I, O, or Q)' });
  }

  try {
    const resp = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`
    );

    if (!resp.ok) {
      return res.status(502).json({ error: `NHTSA API returned ${resp.status}` });
    }

    const data = await resp.json();
    const results = data?.Results?.[0];

    if (!results) {
      return res.status(404).json({ error: 'No results from NHTSA' });
    }

    const decoded: Partial<VinResult> = { vin };

    for (const [nhtsaField, ourField] of Object.entries(FIELD_MAP)) {
      const val = results[nhtsaField.replace(/[^a-zA-Z0-9]/g, '')] || results[nhtsaField] || '';
      if (val && val !== 'Not Applicable' && val !== '') {
        (decoded as any)[ourField] = ourField === 'year' ? parseInt(val) || 0 : val;
      }
    }

    // NHTSA uses slightly different field names internally
    // Let's map directly from the response keys
    decoded.make = results.Make || '';
    decoded.model = results.Model || '';
    decoded.year = parseInt(results.ModelYear) || 0;
    decoded.trim = results.Trim || '';
    decoded.engine = results.EngineModel || '';
    decoded.displacement = results.DisplacementL || '';
    decoded.cylinders = results.EngineCylinders || '';
    decoded.drivetrain = results.DriveType || '';
    decoded.bodyType = results.BodyClass || '';
    decoded.fuelType = results.FuelTypePrimary || '';
    decoded.transmission = results.TransmissionStyle || '';
    decoded.doors = results.Doors || '';
    decoded.plantCountry = results.PlantCountry || '';
    decoded.vehicleType = results.VehicleType || '';
    decoded.errorCode = results.ErrorCode || '0';
    decoded.errorText = results.ErrorText || '';

    return res.status(200).json(decoded);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'VIN decode failed' });
  }
}
