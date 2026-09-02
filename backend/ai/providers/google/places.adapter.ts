/**
 * Google Places Adapter — attractions, restaurants, and directions.
 */

import axios from "axios";
import NodeCache from "node-cache";
import { PlacesProvider } from "../interfaces";
import {
  DestinationAgentResult, RestaurantAgentResult, TransportAgentResult,
} from "../../types/results";
import { PlacesSearchInput, RestaurantSearchInput, TransportInput } from "../../types/tools";

const cache = new NodeCache({ stdTTL: 600 }); // 10-min cache

export class GooglePlacesAdapter implements PlacesProvider {
  readonly name = "Google Places";
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY!;
  }

  async searchAttractions(input: PlacesSearchInput): Promise<DestinationAgentResult> {
    const cacheKey = `attractions:${input.location}:${input.categories?.join(",")}`;
    const cached = cache.get<DestinationAgentResult>(cacheKey);
    if (cached) return cached;

    const retrievedAt = new Date().toISOString();
    try {
      const types = input.categories?.join("|") ?? "tourist_attraction|museum|park";
      const res = await axios.get("https://maps.googleapis.com/maps/api/place/textsearch/json", {
        params: { query: `${types} in ${input.location}`, key: this.apiKey, radius: input.radius },
      });

      const results = (res.data.results as Record<string, unknown>[]).slice(0, input.maxResults ?? 10);
      const attractions = results.map((p, i) => ({
        id: p.place_id as string ?? `G-ATT-${i}`,
        label: { dataType: "live" as const, source: "Google Places API", retrievedAt },
        name: p.name as string,
        category: ((p.types as string[])[0] ?? "attraction"),
        description: `Popular attraction: ${p.name}`,
        address: p.formatted_address as string,
        latitude: ((p.geometry as Record<string, unknown>).location as Record<string, number>).lat,
        longitude: ((p.geometry as Record<string, unknown>).location as Record<string, number>).lng,
        rating: p.rating as number,
        reviewCount: p.user_ratings_total as number,
        openingHours: (p.opening_hours as Record<string, unknown>)?.open_now != null
          ? ((p.opening_hours as Record<string, unknown>).open_now ? "Currently open" : "Currently closed")
          : undefined,
      }));

      const result: DestinationAgentResult = {
        available: true,
        label: { dataType: "live", source: "Google Places API", retrievedAt },
        destination: input.location,
        attractions,
      };
      cache.set(cacheKey, result);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { available: false, reason: `Google Places error: ${message}`, provider: "Google Places", attemptedAt: retrievedAt };
    }
  }

  async searchRestaurants(input: RestaurantSearchInput): Promise<RestaurantAgentResult> {
    const cacheKey = `restaurants:${input.location}:${input.cuisine}:${input.dietary?.join(",")}`;
    const cached = cache.get<RestaurantAgentResult>(cacheKey);
    if (cached) return cached;

    const retrievedAt = new Date().toISOString();
    try {
      const query = [input.cuisine, "restaurant", input.dietary?.join(" "), "in", input.location].filter(Boolean).join(" ");
      const res = await axios.get("https://maps.googleapis.com/maps/api/place/textsearch/json", {
        params: { query, key: this.apiKey, radius: input.radius, opennow: input.openNow },
      });

      const restaurants = ((res.data.results as Record<string, unknown>[]) ?? [])
        .filter((r) => !input.minRating || (r.rating as number) >= input.minRating)
        .slice(0, input.maxResults ?? 8)
        .map((r, i) => ({
          id: r.place_id as string ?? `G-RST-${i}`,
          label: { dataType: "live" as const, source: "Google Places API", retrievedAt },
          name: r.name as string,
          cuisine: input.cuisine ?? "Various",
          address: r.formatted_address as string,
          latitude: ((r.geometry as Record<string, unknown>).location as Record<string, number>).lat,
          longitude: ((r.geometry as Record<string, unknown>).location as Record<string, number>).lng,
          rating: r.rating as number,
          reviewCount: r.user_ratings_total as number,
          priceLevel: r.price_level as 1 | 2 | 3 | 4,
          openNow: (r.opening_hours as Record<string, unknown>)?.open_now as boolean,
          dietaryOptions: input.dietary ?? [],
        }));

      const result: RestaurantAgentResult = {
        available: true,
        label: { dataType: "live", source: "Google Places API", retrievedAt },
        restaurants,
        searchParams: input,
      };
      cache.set(cacheKey, result);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { available: false, reason: `Google Places error: ${message}`, provider: "Google Places", attemptedAt: retrievedAt };
    }
  }

  async getDirections(input: TransportInput): Promise<TransportAgentResult> {
    const retrievedAt = new Date().toISOString();
    try {
      const res = await axios.get("https://maps.googleapis.com/maps/api/directions/json", {
        params: {
          origin: input.from,
          destination: input.to,
          mode: input.mode,
          key: this.apiKey,
          departure_time: input.departureTime ? new Date(input.departureTime).getTime() / 1000 : "now",
        },
      });

      if (res.data.status !== "OK") {
        return { available: false, reason: `Google Directions: ${res.data.status}`, provider: "Google Directions", attemptedAt: retrievedAt };
      }

      const route = (res.data.routes as Record<string, unknown>[])[0];
      const leg = (route.legs as Record<string, unknown>[])[0];
      const duration = (leg.duration as Record<string, unknown>).value as number;
      const distance = (leg.distance as Record<string, unknown>).value as number;

      return {
        available: true,
        label: { dataType: "live", source: "Google Directions API", retrievedAt },
        from: input.from,
        to: input.to,
        options: [{
          id: `GDIR-${Date.now()}`,
          label: { dataType: "live" as const, source: "Google Directions API", retrievedAt },
          mode: input.mode,
          durationMinutes: Math.round(duration / 60),
          distanceKm: parseFloat((distance / 1000).toFixed(2)),
          steps: ((leg.steps as Record<string, unknown>[]) ?? []).slice(0, 5).map((s) =>
            (s.html_instructions as string).replace(/<[^>]+>/g, "")
          ),
        }],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { available: false, reason: `Google Directions error: ${message}`, provider: "Google Directions", attemptedAt: retrievedAt };
    }
  }
}
