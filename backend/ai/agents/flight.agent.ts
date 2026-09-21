/**
 * Flight Agent — searches flights with filters, sorting, and flexible dates.
 */

import { ProviderRegistry } from "../providers/interfaces";
import { FlightResult, FlightOffer } from "../types/results";
import { FlightSearchInputSchema, FlightSearchInput } from "../types/tools";
import { addDays } from "../engine/distance";

export interface FlightSearchOptions extends FlightSearchInput {
  sortBy?: string;
  maxStops?: number;
  dateFlexDays?: number;
}

export class FlightAgent {
  constructor(private providers: ProviderRegistry) {}

  async search(rawInput: unknown): Promise<FlightResult> {
    const input = FlightSearchInputSchema.parse(rawInput);
    const opts = rawInput as FlightSearchOptions;
    if (opts.dateFlexDays && opts.dateFlexDays > 0) {
      return this.searchFlexibleDates(opts);
    }
    return this.searchWithFallback(opts);
  }

  async searchFlexibleDates(input: FlightSearchOptions): Promise<FlightResult> {
    const flex = Math.min(input.dateFlexDays ?? 0, 3);
    const dates: string[] = [];
    for (let d = -flex; d <= flex; d++) {
      dates.push(addDays(input.departureDate, d));
    }

    const allFlights: Array<FlightOffer & { searchDate?: string }> = [];
    let label: FlightResult & { available: true } | null = null;

    for (const dep of dates) {
      const result = await this.providers.flights.searchFlights({
        ...input,
        departureDate: dep,
      });
      if (result.available) {
        if (!label) label = result;
        for (const f of result.flights) {
          allFlights.push({ ...f, searchDate: dep });
        }
      }
    }

    if (!allFlights.length) {
      return {
        available: false,
        reason: `No flights found within ±${flex} days of ${input.departureDate}`,
        provider: this.providers.flights.name,
        attemptedAt: new Date().toISOString(),
      };
    }

    const sorted = this.applyFiltersAndSort(allFlights, input);
    const unique = sorted.slice(0, input.maxResults ?? 5);

    return {
      available: true,
      label: label!.label,
      flights: unique,
      searchParams: {
        origin: input.origin,
        destination: input.destination,
        departureDate: input.departureDate,
        returnDate: input.returnDate,
        adults: input.adults,
        cabinClass: input.cabinClass,
      },
      flexibleDatesSearched: dates,
    };
  }

  applyFiltersAndSort(flights: FlightOffer[], input: FlightSearchOptions): FlightOffer[] {
    let list = [...flights];
    if (input.maxPrice) {
      list = list.filter((f) => f.price.amount <= input.maxPrice!.amount);
    }
    if (typeof input.maxStops === "number") {
      list = list.filter((f) => f.stops <= input.maxStops!);
    }
    const sortBy = input.sortBy ?? "cheapest";
    if (sortBy === "fastest") {
      list.sort((a, b) => a.durationMinutes - b.durationMinutes);
    } else if (sortBy === "best_value") {
      list.sort((a, b) =>
        (a.price.amount / Math.max(a.durationMinutes, 1)) -
        (b.price.amount / Math.max(b.durationMinutes, 1))
      );
    } else {
      list.sort((a, b) => a.price.amount - b.price.amount);
    }
    return list;
  }

  async searchWithFallback(input: FlightSearchOptions): Promise<FlightResult> {
    const validated = FlightSearchInputSchema.parse(input);
    const result = await this.providers.flights.searchFlights(validated);
    if (!result.available) return result;
    return { ...result, flights: this.applyFiltersAndSort(result.flights, input) };
  }
}
