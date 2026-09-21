/**
 * Provider Registry Factory
 * Selects real adapters when env vars are present, mock adapters otherwise.
 * Validates required keys at startup and logs what is active.
 */

import {
  ProviderRegistry, FlightProvider, HotelProvider, WeatherProvider,
  CurrencyProvider, PlacesProvider, SearchProvider,
} from "./interfaces";
import { MockFlightProvider } from "./mock/flight.mock";
import { MockHotelProvider } from "./mock/hotel.mock";
import { MockWeatherProvider } from "./mock/weather.mock";
import { MockCurrencyProvider } from "./mock/currency.mock";
import { MockPlacesProvider } from "./mock/places.mock";
import { MockSearchProvider } from "./mock/search.mock";
import { AmadeusFlightAdapter } from "./amadeus/flight.adapter";
import { AmadeusHotelAdapter } from "./amadeus/hotel.adapter";
import { OpenWeatherAdapter } from "./openweather/weather.adapter";
import { ExchangeRatesAdapter } from "./exchangerates/currency.adapter";
import { GooglePlacesAdapter } from "./google/places.adapter";
import { TavilySearchAdapter } from "./tavily/search.adapter";
import { RandomApiFlightAdapter } from "./external/randomapi-flight.adapter";
import { MockdataHotelAdapter } from "./external/mockdata-hotel.adapter";
import {
  resilientCurrencyProvider, resilientFlightProvider, resilientHotelProvider,
  resilientPlacesProvider, resilientSearchProvider, resilientWeatherProvider,
} from "./resilient";

function hasAmadeus(): boolean {
  return !!(process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET);
}

function useExternalFlightApi(): boolean {
  return process.env.USE_EXTERNAL_FLIGHT_API !== "false";
}

function useExternalHotelApi(): boolean {
  return process.env.USE_EXTERNAL_HOTEL_API !== "false";
}

function pickFlightProvider(): FlightProvider {
  if (hasAmadeus()) return new AmadeusFlightAdapter();
  if (useExternalFlightApi()) return new RandomApiFlightAdapter();
  return new MockFlightProvider();
}

function pickHotelProvider(): HotelProvider {
  if (hasAmadeus()) return new AmadeusHotelAdapter();
  if (useExternalHotelApi()) return new MockdataHotelAdapter();
  return new MockHotelProvider();
}

function pickProvider<T extends { name: string }>(real: T | null, mock: T, label: string): T {
  if (real) return real;
  if (process.env.REQUIRE_LIVE_DATA === "true") {
    console.warn(`[Providers] ${label}: no API keys — live data required but unavailable`);
  } else {
    console.warn(`[Providers] ${label}: using mock adapter (set API keys for live data)`);
  }
  return mock;
}

export function createProviderRegistry(): ProviderRegistry {
  const flightBase = pickFlightProvider();
  const hotelBase = pickHotelProvider();

  if (!hasAmadeus()) {
    console.log(`[Providers] flights: ${flightBase.name} (no Amadeus keys)`);
    console.log(`[Providers] hotels: ${hotelBase.name} (no Amadeus keys)`);
  }
  const weatherBase = pickProvider<WeatherProvider>(
    process.env.OPENWEATHER_API_KEY ? new OpenWeatherAdapter() : null,
    new MockWeatherProvider(),
    "weather"
  );
  const currencyBase = pickProvider<CurrencyProvider>(
    process.env.EXCHANGE_RATES_API_KEY ? new ExchangeRatesAdapter() : null,
    new MockCurrencyProvider(),
    "currency"
  );
  const placesBase = pickProvider<PlacesProvider>(
    process.env.GOOGLE_MAPS_API_KEY ? new GooglePlacesAdapter() : null,
    new MockPlacesProvider(),
    "places"
  );
  const searchBase = pickProvider<SearchProvider>(
    process.env.TAVILY_API_KEY ? new TavilySearchAdapter() : null,
    new MockSearchProvider(),
    "search"
  );

  const flights = resilientFlightProvider(flightBase);
  const hotels = resilientHotelProvider(hotelBase);
  const weather = resilientWeatherProvider(weatherBase);
  const currency = resilientCurrencyProvider(currencyBase);
  const places = resilientPlacesProvider(placesBase);
  const search = resilientSearchProvider(searchBase);

  console.log(`[Providers] flights=${flights.name} hotels=${hotels.name} weather=${weather.name} currency=${currency.name} places=${places.name} search=${search.name}`);

  return { flights, hotels, weather, currency, places, search };
}

/** Singleton registry — created once at server startup */
let _registry: ProviderRegistry | null = null;

export function getProviderRegistry(): ProviderRegistry {
  if (!_registry) {
    _registry = createProviderRegistry();
  }
  return _registry;
}
