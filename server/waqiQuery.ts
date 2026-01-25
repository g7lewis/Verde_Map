interface WaqiData {
  aqi: number | null;
  stationName: string | null;
  dominantPollutant: string | null;
  pollutants: {
    pm25?: number;
    pm10?: number;
    o3?: number;
    no2?: number;
    so2?: number;
    co?: number;
  };
  lastUpdated: string | null;
}

export async function queryAirQuality(lat: number, lng: number): Promise<WaqiData> {
  const token = process.env.WAQI_API_TOKEN || "demo";
  
  try {
    const response = await fetch(
      `https://api.waqi.info/feed/geo:${lat};${lng}/?token=${token}`,
      {
        headers: {
          'User-Agent': 'Verde/1.0 (environmental mapping app)',
        }
      }
    );
    
    if (!response.ok) {
      console.warn(`WAQI API failed: ${response.status}`);
      return getEmptyResult();
    }
    
    const data = await response.json();
    
    if (data.status !== "ok" || !data.data) {
      console.warn("WAQI API returned non-ok status:", data.status);
      return getEmptyResult();
    }
    
    const aqiData = data.data;
    
    return {
      aqi: typeof aqiData.aqi === "number" ? aqiData.aqi : null,
      stationName: aqiData.city?.name || null,
      dominantPollutant: aqiData.dominentpol || null,
      pollutants: {
        pm25: aqiData.iaqi?.pm25?.v,
        pm10: aqiData.iaqi?.pm10?.v,
        o3: aqiData.iaqi?.o3?.v,
        no2: aqiData.iaqi?.no2?.v,
        so2: aqiData.iaqi?.so2?.v,
        co: aqiData.iaqi?.co?.v,
      },
      lastUpdated: aqiData.time?.s || null,
    };
  } catch (error) {
    console.warn("WAQI query error:", error);
    return getEmptyResult();
  }
}

function getEmptyResult(): WaqiData {
  return {
    aqi: null,
    stationName: null,
    dominantPollutant: null,
    pollutants: {},
    lastUpdated: null,
  };
}

export function aqiToScore(aqi: number | null): number | null {
  if (aqi === null) return null;
  
  if (aqi <= 50) return Math.round(100 - aqi * 0.2);
  if (aqi <= 100) return Math.round(90 - (aqi - 50) * 0.6);
  if (aqi <= 150) return Math.round(60 - (aqi - 100) * 0.4);
  if (aqi <= 200) return Math.round(40 - (aqi - 150) * 0.3);
  if (aqi <= 300) return Math.round(25 - (aqi - 200) * 0.15);
  return Math.max(5, Math.round(10 - (aqi - 300) * 0.05));
}

export function getAqiCategory(aqi: number | null): string {
  if (aqi === null) return "Unknown";
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}
