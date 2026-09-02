/**
 * Provider Registry Factory
 * Selects real adapters when env vars are present, mock adapters otherwise.
 * Validates required keys at startup and logs what is active.
 */

import { ProviderRegistry } from "./interfaces";
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

function hasAmadeus(): boolean {
  return !!(process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET);
}

export function createProviderRegistry(): ProviderRegistry {
  const flights = hasAmadeus() ? new AmadeusFlightAdapter() : new MockFlightProvider();
  const hotels = hasAmadeus() ? new AmadeusHotelAdapter() : new MockHotelProvider();
  const weather = process.env.OPENWEATHER_API_KEY ? new OpenWeatherAdapter() : new MockWeatherProvider();
  const currency = process.env.EXCHANGE_RATES_API_KEY ? new ExchangeRatesAdapter() : new MockCurrencyProvider();
  const places = process.env.GOOGLE_MAPS_API_KEY ? new GooglePlacesAdapter() : new MockPlacesProvider();
  const search = process.env.TAVILY_API_KEY ? new TavilySearchAdapter() : new MockSearchProvider();

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
