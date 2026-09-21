/** Distance and walking-time helpers (deterministic, no LLM). */

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

/** Walking speed ~5 km/h */
export function walkingMinutes(distanceKm: number): number {
  return Math.max(1, Math.round((distanceKm / 5) * 60));
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Map Google price level 1-4 to approximate INR per person */
export function priceLevelToInr(level?: number): number {
  const map: Record<number, number> = { 1: 200, 2: 500, 3: 1000, 4: 2000 };
  return map[level ?? 2] ?? 500;
}
