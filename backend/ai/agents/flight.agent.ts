/**
 * Flight Agent — searches for flights using FlightProvider.
 * Never invents prices or schedules. Returns FlightResult with provenance.
 */

import { ProviderRegistry } from "../providers/interfaces";
import { FlightResult } from "../types/results";
import { FlightSearchInputSchema, FlightSearchInput } from "../types/tools";

export class FlightAgent {
  constructor(private providers: ProviderRegistry) {}

  async search(rawInput: unknown): Promise<FlightResult> {
    // Validate input with Zod — no unvalidated data reaches the provider
    const input = FlightSearchInputSchema.parse(rawInput);
    return this.providers.flights.searchFlights(input);
  }

  async searchWithFallback(input: FlightSearchInput): Promise<FlightResult> {
    const validated = FlightSearchInputSchema.parse(input);
    const result = await this.providers.flights.searchFlights(validated);

    // If available, sort by price ascending
    if (result.available) {
      result.flights.sort((a, b) => a.price.amount - b.price.amount);
    }

    return result;
  }
}
