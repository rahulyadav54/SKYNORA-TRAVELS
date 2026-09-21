/**
 * Hotel Agent — search with filtering and sorting.
 */

import { ProviderRegistry } from "../providers/interfaces";
import { HotelResult } from "../types/results";
import { HotelSearchInputSchema, HotelSearchInput } from "../types/tools";
import { calcNights } from "../engine/calculator";

export interface HotelSearchOptions extends HotelSearchInput {
  maxTotalStayCost?: { amount: number; currency: string };
  minRating?: number;
  sortBy?: "cheapest" | "rating" | "best_value";
  freeCancellation?: boolean;
}

export class HotelAgent {
  constructor(private providers: ProviderRegistry) {}

  async search(rawInput: unknown): Promise<HotelResult> {
    const input = HotelSearchInputSchema.parse(rawInput);
    const opts = rawInput as HotelSearchOptions;
    const result = await this.providers.hotels.searchHotels(input);

    if (!result.available) return result;

    let hotels = [...result.hotels];
    const nights = calcNights(input.checkIn, input.checkOut);

    if (opts.maxTotalStayCost) {
      hotels = hotels.filter((h) =>
        h.totalPrice.amount <= opts.maxTotalStayCost!.amount &&
        h.totalPrice.currency === opts.maxTotalStayCost!.currency
      );
    }
    if (opts.minRating != null) {
      hotels = hotels.filter((h) => (h.rating ?? 0) >= opts.minRating!);
    }
    if (opts.freeCancellation) {
      hotels = hotels.filter((h) =>
        h.amenities?.some((a) => /cancel|refund/i.test(a))
      );
    }

    const sortBy = opts.sortBy ?? "cheapest";
    if (sortBy === "rating") {
      hotels.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (sortBy === "best_value") {
      hotels.sort((a, b) => {
        const scoreA = (a.rating ?? 3) / Math.max(a.pricePerNight.amount, 1);
        const scoreB = (b.rating ?? 3) / Math.max(b.pricePerNight.amount, 1);
        return scoreB - scoreA;
      });
    } else {
      hotels.sort((a, b) => a.totalPrice.amount - b.totalPrice.amount);
    }

    return {
      ...result,
      hotels,
      nights,
    };
  }
}
