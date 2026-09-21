/**
 * Resilient provider wrappers — retry transient failures before giving up.
 * Never falls back from a real provider to mock data on failure.
 */

import {
  FlightProvider, HotelProvider, WeatherProvider, CurrencyProvider,
  PlacesProvider, SearchProvider,
} from "./interfaces";
import {
  FlightResult, HotelResult, WeatherAgentResult, CurrencyAgentResult,
  DestinationAgentResult, RestaurantAgentResult, TransportAgentResult,
  SearchAgentResult,
} from "../types/results";
import {
  FlightSearchInput, HotelSearchInput, WeatherInput, CurrencyInput,
  PlacesSearchInput, RestaurantSearchInput, TransportInput, WebSearchInput,
} from "../types/tools";

const RETRYABLE = /timeout|ECONNRESET|ENOTFOUND|429|502|503|504/i;

async function withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      if (!RETRYABLE.test(message) || i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw lastError;
}

export function resilientFlightProvider(provider: FlightProvider): FlightProvider {
  return {
    name: provider.name,
    searchFlights: (input: FlightSearchInput) =>
      withRetry(() => provider.searchFlights(input)),
  };
}

export function resilientHotelProvider(provider: HotelProvider): HotelProvider {
  return {
    name: provider.name,
    searchHotels: (input: HotelSearchInput) =>
      withRetry(() => provider.searchHotels(input)),
  };
}

export function resilientWeatherProvider(provider: WeatherProvider): WeatherProvider {
  return {
    name: provider.name,
    getForecast: (input: WeatherInput) =>
      withRetry(() => provider.getForecast(input)),
  };
}

export function resilientCurrencyProvider(provider: CurrencyProvider): CurrencyProvider {
  return {
    name: provider.name,
    getRate: (input: CurrencyInput) =>
      withRetry(() => provider.getRate(input)),
  };
}

export function resilientPlacesProvider(provider: PlacesProvider): PlacesProvider {
  return {
    name: provider.name,
    searchAttractions: (input: PlacesSearchInput) =>
      withRetry(() => provider.searchAttractions(input)),
    searchRestaurants: (input: RestaurantSearchInput) =>
      withRetry(() => provider.searchRestaurants(input)),
    getDirections: (input: TransportInput) =>
      withRetry(() => provider.getDirections(input)),
  };
}

export function resilientSearchProvider(provider: SearchProvider): SearchProvider {
  return {
    name: provider.name,
    search: (input: WebSearchInput) =>
      withRetry(() => provider.search(input)),
  };
}

/** Skip mock providers when REQUIRE_LIVE_DATA=true */
export function isLiveProvider(name: string): boolean {
  if (process.env.REQUIRE_LIVE_DATA !== "true") return true;
  return !name.toLowerCase().includes("mock");
}
