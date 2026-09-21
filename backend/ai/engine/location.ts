/**
 * Location resolution — converts place names to airport/city codes using
 * curated mappings and optional Google Geocoding API.
 */

import axios from "axios";

export interface ResolvedLocation {
  query: string;
  airportCode?: string;
  cityCode?: string;
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
  source: string;
  retrievedAt: string;
}

/** Common travel cities → IATA airport + Amadeus city codes */
const LOCATION_INDEX: Record<string, { airport: string; city: string }> = {
  chennai: { airport: "MAA", city: "MAA" },
  guindy: { airport: "MAA", city: "MAA" },
  madras: { airport: "MAA", city: "MAA" },
  delhi: { airport: "DEL", city: "DEL" },
  "new delhi": { airport: "DEL", city: "DEL" },
  mumbai: { airport: "BOM", city: "BOM" },
  bombay: { airport: "BOM", city: "BOM" },
  bangalore: { airport: "BLR", city: "BLR" },
  bengaluru: { airport: "BLR", city: "BLR" },
  hyderabad: { airport: "HYD", city: "HYD" },
  kolkata: { airport: "CCU", city: "CCU" },
  calcutta: { airport: "CCU", city: "CCU" },
  pune: { airport: "PNQ", city: "PNQ" },
  goa: { airport: "GOI", city: "GOI" },
  kochi: { airport: "COK", city: "COK" },
  cochin: { airport: "COK", city: "COK" },
  seoul: { airport: "ICN", city: "SEL" },
  "south korea": { airport: "ICN", city: "SEL" },
  busan: { airport: "PUS", city: "PUS" },
  tokyo: { airport: "NRT", city: "TYO" },
  japan: { airport: "NRT", city: "TYO" },
  osaka: { airport: "KIX", city: "OSA" },
  singapore: { airport: "SIN", city: "SIN" },
  dubai: { airport: "DXB", city: "DXB" },
  london: { airport: "LHR", city: "LON" },
  paris: { airport: "CDG", city: "PAR" },
  bangkok: { airport: "BKK", city: "BKK" },
  bali: { airport: "DPS", city: "DPS" },
  sydney: { airport: "SYD", city: "SYD" },
  melbourne: { airport: "MEL", city: "MEL" },
  newyork: { airport: "JFK", city: "NYC" },
  "new york": { airport: "JFK", city: "NYC" },
  losangeles: { airport: "LAX", city: "LAX" },
  "los angeles": { airport: "LAX", city: "LAX" },
  hongkong: { airport: "HKG", city: "HKG" },
  "hong kong": { airport: "HKG", city: "HKG" },
  kualalumpur: { airport: "KUL", city: "KUL" },
  "kuala lumpur": { airport: "KUL", city: "KUL" },
};

function normaliseKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function lookupStatic(location: string): ResolvedLocation | null {
  const key = normaliseKey(location);
  const direct = LOCATION_INDEX[key];
  if (direct) {
    return {
      query: location,
      airportCode: direct.airport,
      cityCode: direct.city,
      source: "SkyNora location index",
      retrievedAt: new Date().toISOString(),
    };
  }

  for (const [name, codes] of Object.entries(LOCATION_INDEX)) {
    if (key.includes(name) || name.includes(key)) {
      return {
        query: location,
        airportCode: codes.airport,
        cityCode: codes.city,
        source: "SkyNora location index (partial match)",
        retrievedAt: new Date().toISOString(),
      };
    }
  }

  return null;
}

async function lookupGoogle(location: string): Promise<ResolvedLocation | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  const retrievedAt = new Date().toISOString();
  try {
    const res = await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
      params: { address: location, key: apiKey },
    });

    const result = (res.data.results as Record<string, unknown>[])?.[0];
    if (!result) return null;

    const geometry = result.geometry as Record<string, unknown>;
    const coords = geometry.location as Record<string, number>;

    return {
      query: location,
      formattedAddress: result.formatted_address as string,
      latitude: coords.lat,
      longitude: coords.lng,
      source: "Google Geocoding API",
      retrievedAt,
    };
  } catch {
    return null;
  }
}

/** Resolve a place name to airport and/or city IATA codes */
export async function resolveLocation(location: string): Promise<ResolvedLocation> {
  const staticResult = lookupStatic(location);
  if (staticResult) return staticResult;

  const googleResult = await lookupGoogle(location);
  if (googleResult) return googleResult;

  return {
    query: location,
    source: "unresolved",
    retrievedAt: new Date().toISOString(),
  };
}

/** Resolve to 3-letter airport IATA code — throws if unresolved */
export async function resolveAirportCode(location: string): Promise<string> {
  if (/^[A-Za-z]{3}$/.test(location.trim())) {
    return location.trim().toUpperCase();
  }

  const resolved = await resolveLocation(location);
  if (resolved.airportCode) return resolved.airportCode;

  throw new Error(
    `Could not resolve "${location}" to an airport code. Use resolve_location first or provide a 3-letter IATA code.`
  );
}

/** Resolve to city code for hotel search */
export async function resolveCityCode(location: string): Promise<string> {
  if (/^[A-Za-z]{3}$/.test(location.trim())) {
    return location.trim().toUpperCase();
  }

  const resolved = await resolveLocation(location);
  if (resolved.cityCode) return resolved.cityCode;
  if (resolved.airportCode) return resolved.airportCode;

  throw new Error(
    `Could not resolve "${location}" to a city code. Use resolve_location first or provide a 3-letter city code.`
  );
}
