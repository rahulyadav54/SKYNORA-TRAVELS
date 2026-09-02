/**
 * Restaurant Agent
 */

import { ProviderRegistry } from "../providers/interfaces";
import { RestaurantAgentResult } from "../types/results";
import { RestaurantSearchInputSchema } from "../types/tools";

export class RestaurantAgent {
  constructor(private providers: ProviderRegistry) {}

  async search(rawInput: unknown): Promise<RestaurantAgentResult> {
    const input = RestaurantSearchInputSchema.parse(rawInput);
    return this.providers.places.searchRestaurants(input);
  }
}
