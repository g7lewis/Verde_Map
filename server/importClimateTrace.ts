import { db } from "./db";
import { emissionsSources } from "@shared/schema";
import { sql } from "drizzle-orm";

// All countries with significant emissions sources (ISO3 codes)
const ALL_COUNTRIES = [
  // Top emitters
  "CHN", "USA", "IND", "RUS", "JPN", "DEU", "IRN", "SAU", "IDN", "KOR",
  "CAN", "MEX", "BRA", "AUS", "GBR", "TUR", "FRA", "ITA", "POL", "THA",
  "ZAF", "ESP", "VNM", "TWN", "MYS", "EGY", "PAK", "ARE", "NGA", "ARG",
  "KAZ", "IRQ", "VEN", "NLD", "PHL", "DZA", "UKR", "BGD", "KWT", "COL",
  "CZE", "BEL", "CHL", "ROU", "OMN", "PER", "QAT", "GRC", "ISR", "AUT",
  // Additional countries for coverage
  "NOR", "SWE", "FIN", "DNK", "CHE", "PRT", "IRL", "NZL", "SGP", "HKG",
  "HUN", "SVK", "BGR", "HRV", "SRB", "LTU", "SVN", "LVA", "EST", "LUX",
  "TKM", "UZB", "AZE", "BLR", "AGO", "LBY", "SDN", "ETH", "KEN", "TZA",
  "GHA", "CIV", "CMR", "MAR", "TUN", "SEN", "MOZ", "ZWE", "ZMB", "UGA",
  "MMR", "NPL", "LKA", "KHM", "LAO", "MNG", "PRK", "BTN", "MDV", "BRN",
  "ECU", "BOL", "PRY", "URY", "PAN", "CRI", "GTM", "HND", "SLV", "NIC",
  "DOM", "CUB", "HTI", "JAM", "TTO", "BHS", "BRB", "GUY", "SUR", "BLZ",
];

interface ClimateTraceAsset {
  Id: number;
  Name: string;
  Country: string;
  Sector: string;
  Centroid?: {
    Geometry: [number, number]; // [lng, lat]
    SRID: number;
  };
  EmissionsSummary?: Array<{
    Gas: string;
    EmissionsQuantity: number | null;
  }>;
}

async function fetchCountryData(country: string, maxOffset = 50000): Promise<ClimateTraceAsset[]> {
  const assets: ClimateTraceAsset[] = [];
  const limit = 1000;
  let offset = 0;
  
  while (offset < maxOffset) {
    try {
      const url = `https://api.climatetrace.org/v6/assets?countries=${country}&year=2022&limit=${limit}&offset=${offset}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.log(`  ${country}: HTTP ${response.status} at offset ${offset}`);
        break;
      }
      
      const data = await response.json();
      const newAssets = data.assets || [];
      
      if (newAssets.length === 0) break;
      
      assets.push(...newAssets);
      
      if (newAssets.length < limit) break;
      offset += limit;
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log(`  ${country}: Timeout at offset ${offset}`);
      }
      break;
    }
  }
  
  return assets;
}

function extractEmissions(asset: ClimateTraceAsset): number | null {
  if (!asset.EmissionsSummary) return null;
  const co2e = asset.EmissionsSummary.find(e => e.Gas === 'co2e_100yr');
  return co2e?.EmissionsQuantity ?? null;
}

async function importAllData() {
  console.log("Starting Climate TRACE data import...");
  console.log(`Importing from ${ALL_COUNTRIES.length} countries\n`);
  
  let totalImported = 0;
  const startTime = Date.now();
  
  // Clear existing data
  console.log("Clearing existing data...");
  await db.delete(emissionsSources);
  
  // Process countries in batches of 5 for parallel fetching
  const batchSize = 5;
  for (let i = 0; i < ALL_COUNTRIES.length; i += batchSize) {
    const batch = ALL_COUNTRIES.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(async (country) => {
        const assets = await fetchCountryData(country);
        console.log(`  ${country}: ${assets.length} assets`);
        return { country, assets };
      })
    );
    
    // Insert all assets from this batch
    for (const { country, assets } of batchResults) {
      if (assets.length === 0) continue;
      
      const records = assets
        .filter(a => a.Centroid?.Geometry)
        .map(a => ({
          sourceId: String(a.Id),
          name: a.Name || "Unknown",
          country: a.Country || country,
          sector: a.Sector || "unknown",
          lng: a.Centroid!.Geometry[0],
          lat: a.Centroid!.Geometry[1],
          emissions: extractEmissions(a),
        }));
      
      if (records.length > 0) {
        // Insert in chunks of 500 to avoid query size limits
        for (let j = 0; j < records.length; j += 500) {
          const chunk = records.slice(j, j + 500);
          await db.insert(emissionsSources).values(chunk);
        }
        totalImported += records.length;
      }
    }
    
    console.log(`Progress: ${Math.min(i + batchSize, ALL_COUNTRIES.length)}/${ALL_COUNTRIES.length} countries, ${totalImported} sources\n`);
  }
  
  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\nImport complete!`);
  console.log(`Total sources: ${totalImported}`);
  console.log(`Time elapsed: ${elapsed} minutes`);
  
  // Get count from database
  const result = await db.select({ count: sql<number>`count(*)` }).from(emissionsSources);
  console.log(`Database count: ${result[0].count}`);
}

// Run import
importAllData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Import failed:", err);
    process.exit(1);
  });
