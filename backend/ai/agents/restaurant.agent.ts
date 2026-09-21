/**
 * Restaurant Agent — search with budget and walking-time enrichment.
 */

import { ProviderRegistry } from "../providers/interfaces";
import { RestaurantAgentResult, Restaurant } from "../types/results";
import { RestaurantSearchInputSchema } from "../types/tools";
import { haversineKm, walkingMinutes, priceLevelToInr } from "../engine/distance";

export interface RestaurantSearchOptions {
  maxBudgetPerPerson?: number;
  userLat?: number;
  userLng?: number;
}

export class RestaurantAgent {
  constructor(private providers: ProviderRegistry) {}

  enrichRestaurant(r: Restaurant, opts: RestaurantSearchOptions): Restaurant & {
    estimatedCostPerPerson?: { amount: number; currency: string };
    walkingDistanceKm?: number;
    walkingTimeMinutes?: number;
  } {
    const estimatedCostPerPerson = {
      amount: priceLevelToInr(r.priceLevel),
      currency: "INR",
    };
    let walkingDistanceKm: number | undefined;
    let walkingTimeMinutes: number | undefined;

    if (opts.userLat != null && opts.userLng != null && r.latitude != null && r.longitude != null) {
      walkingDistanceKm = parseFloat(haversineKm(opts.userLat, opts.userLng, r.latitude, r.longitude).toFixed(2));
      walkingTimeMinutes = walkingMinutes(walkingDistanceKm);
    }

    return { ...r, estimatedCostPerPerson, walkingDistanceKm, walkingTimeMinutes };
  }

  async search(rawInput: unknown, opts: RestaurantSearchOptions = {}): Promise<RestaurantAgentResult> {
    const input = RestaurantSearchInputSchema.parse(rawInput);
    const result = await this.providers.places.searchRestaurants(input);

    if (!result.available) return result;

    let restaurants = result.restaurants.map((r) => this.enrichRestaurant(r, opts));

    if (opts.maxBudgetPerPerson != null || (rawInput as RestaurantSearchOptions).maxBudgetPerPerson != null) {
      const max = opts.maxBudgetPerPerson ?? (rawInput as { maxBudgetPerPerson?: number }).maxBudgetPerPerson!;
      restaurants = restaurants.filter((r) =>
        (r.estimatedCostPerPerson?.amount ?? priceLevelToInr(r.priceLevel)) <= max
      );
    }

    if (opts.userLat != null) {
      restaurants.sort((a, b) => (a.walkingDistanceKm ?? 999) - (b.walkingDistanceKm ?? 999));
    }

    return { ...result, restaurants };
  }
}
