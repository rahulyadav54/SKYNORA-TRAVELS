/**
 * Provider interfaces — every agent calls these, never raw API URLs.
 * Real adapters and mock adapters both implement these interfaces identically.
 */

import {
  FlightResult, HotelResult, WeatherAgentResult, CurrencyAgentResult,
  DestinationAgentResult, RestaurantAgentResult, TransportAgentResult,
  SearchAgentResult,
} from "../types/results";
import {
  FlightSearchInput, HotelSearchInput, WeatherInput, CurrencyInput,
  PlacesSearchInput, RestaurantSearchInput, TransportInput, WebSearchInput,
} from "../types/tools";

export interface FlightProvider {
  readonly name: string;
  searchFlights(input: FlightSearchInput): Promise<FlightResult>;
}

export interface HotelProvider {
  readonly name: string;
  searchHotels(input: HotelSearchInput): Promise<HotelResult>;
}

export interface WeatherProvider {
  readonly name: string;
  getForecast(input: WeatherInput): Promise<WeatherAgentResult>;
}

export interface CurrencyProvider {
  readonly name: string;
  getRate(input: CurrencyInput): Promise<CurrencyAgentResult>;
}

export interface PlacesProvider {
  readonly name: string;
  searchAttractions(input: PlacesSearchInput): Promise<DestinationAgentResult>;
  searchRestaurants(input: RestaurantSearchInput): Promise<RestaurantAgentResult>;
  getDirections(input: TransportInput): Promise<TransportAgentResult>;
}

export interface SearchProvider {
  readonly name: string;
  search(input: WebSearchInput): Promise<SearchAgentResult>;
}

/** Registry of all active providers — injected into agents */
export interface ProviderRegistry {
  flights: FlightProvider;
  hotels: HotelProvider;
  weather: WeatherProvider;
  currency: CurrencyProvider;
  places: PlacesProvider;
  search: SearchProvider;
}
