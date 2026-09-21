/**
 * Route optimizer — orders places to reduce backtracking using nearest-neighbor heuristic.
 */

export interface GeoPlace {
  id: string;
  latitude?: number;
  longitude?: number;
}

function haversineKm(a: GeoPlace, b: GeoPlace): number {
  if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) {
    return Infinity;
  }
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** Order places to minimize travel distance (nearest-neighbor from first item). */
export function orderByProximity<T extends GeoPlace>(places: T[]): T[] {
  if (places.length <= 1) return places;

  const withCoords = places.filter((p) => p.latitude != null && p.longitude != null);
  const withoutCoords = places.filter((p) => p.latitude == null || p.longitude == null);

  if (withCoords.length <= 1) return [...places];

  const remaining = [...withCoords];
  const ordered: T[] = [remaining.shift()!];

  while (remaining.length) {
    const current = ordered[ordered.length - 1];
    let nearestIdx = 0;
    let nearestDist = haversineKm(current, remaining[0]);
    for (let i = 1; i < remaining.length; i++) {
      const d = haversineKm(current, remaining[i]);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }
    ordered.push(remaining.splice(nearestIdx, 1)[0]);
  }

  return [...ordered, ...withoutCoords];
}

/** Estimate how many attractions fit in available hours (default 2h each incl. travel buffer). */
export function maxPlacesForTime(hoursAvailable: number, hoursPerPlace = 2): number {
  return Math.max(1, Math.floor(hoursAvailable / hoursPerPlace));
}
