/**
 * Hotel Agent
 */

import { ProviderRegistry } from "../providers/interfaces";
import { HotelResult } from "../types/results";
import { HotelSearchInputSchema, HotelSearchInput } from "../types/tools";

export class HotelAgent {
  constructor(private providers: ProviderRegistry) {}

  async search(rawInput: unknown): Promise<HotelResult> {
    const input = HotelSearchInputSchema.parse(rawInput);
    const result = await this.providers.hotels.searchHotels(input);

    if (result.available) {
      // Sort by price ascending by default
      result.hotels.sort((a, b) => a.pricePerNight.amount - b.pricePerNight.amount);
    }
    return result;
  }
}
