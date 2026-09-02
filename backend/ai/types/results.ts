/**
 * Result types returned by specialized agents.
 * All agent results are either a typed success payload or DataUnavailable.
 * Agents NEVER guess — they return DataUnavailable if a provider call fails.
 */

import { DataLabel, Money } from "./trip";

/** Returned when a provider call fails — the Orchestrator MUST surface this to the user. */
export interface DataUnavailable {
  available: false;
  reason: string;           // human-readable explanation (no API keys, timeout, etc.)
  provider?: string;
  attemptedAt: string;      // ISO 8601
}

export function isDataUnavailable(val: unknown): val is DataUnavailable {
  return typeof val === "object" && val !== null && (val as DataUnavailable).available === false;
}

/** ── Flight Agent Results ─────────────────────────────────────────────────── */
export interface FlightSearchResult {
  available: true;
  label: DataLabel;
  flights: FlightOffer[];
  searchParams: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    adults: number;
    cabinClass: string;
  };
}

export interface FlightOffer {
  id: string;
  label: DataLabel;
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureAt: string;
  arrivalAt: string;
  durationMinutes: number;
  stops: number;
  stopDetails?: StopDetail[];
  price: Money;
  cabinClass: string;
  seatsAvailable?: number;
  bookingToken?: string;
}

export interface StopDetail {
  airport: string;
  durationMinutes: number;
}

export type FlightResult = FlightSearchResult | DataUnavailable;

/** ── Hotel Agent Results ──────────────────────────────────────────────────── */
export interface HotelSearchResult {
  available: true;
  label: DataLabel;
  hotels: HotelOffer[];
  searchParams: {
    cityCode: string;
    checkIn: string;
    checkOut: string;
    adults: number;
  };
}

export interface HotelOffer {
  id: string;
  label: DataLabel;
  name: string;
  chainCode?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  stars: number;
  rating?: number;
  reviewCount?: number;
  pricePerNight: Money;
  totalPrice: Money;
  amenities?: string[];
  bookingToken?: string;
}

export type HotelResult = HotelSearchResult | DataUnavailable;

/** ── Weather Agent Results ───────────────────────────────────────────────── */
export interface WeatherResult {
  available: true;
  label: DataLabel;
  location: string;
  forecast: WeatherDay[];
  currentConditions?: WeatherCondition;
}

export interface WeatherDay {
  date: string;
  minTemp: number;
  maxTemp: number;
  unit: "C" | "F";
  condition: string;
  precipitationChance: number;
  humidity: number;
  icon: string;
}

export interface WeatherCondition {
  temp: number;
  unit: "C" | "F";
  feelsLike: number;
  condition: string;
  humidity: number;
  windSpeedKmh: number;
}

export type WeatherAgentResult = WeatherResult | DataUnavailable;

/** ── Currency Agent Results ──────────────────────────────────────────────── */
export interface CurrencyResult {
  available: true;
  label: DataLabel;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  convertedAmount?: number;
  rateDate: string;  // ISO date — never allow stale rates without disclosing this
}

export type CurrencyAgentResult = CurrencyResult | DataUnavailable;

/** ── Destination / Attraction Agent Results ─────────────────────────────── */
export interface DestinationResult {
  available: true;
  label: DataLabel;
  destination: string;
  attractions: Attraction[];
}

export interface Attraction {
  id: string;
  label: DataLabel;
  name: string;
  category: string;
  description: string;
  address: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  reviewCount?: number;
  openingHours?: string;
  admissionFee?: Money;
  photoUrl?: string;
}

export type DestinationAgentResult = DestinationResult | DataUnavailable;

/** ── Restaurant Agent Results ───────────────────────────────────────────── */
export interface RestaurantResult {
  available: true;
  label: DataLabel;
  restaurants: Restaurant[];
  searchParams: {
    location: string;
    cuisine?: string;
    dietary?: string[];
    radius?: number;
  };
}

export interface Restaurant {
  id: string;
  label: DataLabel;
  name: string;
  cuisine: string;
  address: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  reviewCount?: number;
  priceLevel?: 1 | 2 | 3 | 4;  // Google Places price level
  openNow?: boolean;
  openingHours?: string[];
  dietaryOptions?: string[];
  photoUrl?: string;
}

export type RestaurantAgentResult = RestaurantResult | DataUnavailable;

/** ── Transport Agent Results ─────────────────────────────────────────────── */
export interface TransportResult {
  available: true;
  label: DataLabel;
  from: string;
  to: string;
  options: TransportOption[];
}

export interface TransportOption {
  id: string;
  label: DataLabel;
  mode: string;
  durationMinutes: number;
  distanceKm: number;
  cost?: Money;
  steps?: string[];
  departureAt?: string;
}

export type TransportAgentResult = TransportResult | DataUnavailable;

/** ── Budget Agent Results ────────────────────────────────────────────────── */
export interface BudgetResult {
  available: true;
  label: DataLabel;
  totalBudget: Money;
  breakdown: Record<string, Money>;
  totalEstimated: Money;
  remaining: Money;
  perPersonPerDay: Money;
  warnings: BudgetWarning[];
}

export interface BudgetWarning {
  category: string;
  message: string;
  severity: "info" | "warning" | "critical";
}

export type BudgetAgentResult = BudgetResult | DataUnavailable;

/** ── Itinerary Agent Results ─────────────────────────────────────────────── */
export interface ItineraryResult {
  available: true;
  label: DataLabel;
  days: ItineraryDay[];
  totalDays: number;
  totalEstimatedCost: Money;
}

export interface ItineraryDay {
  date: string;
  dayNumber: number;
  theme: string;
  activities: ItineraryActivity[];
  meals: ItineraryMeal[];
  transport: ItineraryTransport[];
  estimatedCost: Money;
  notes?: string;
}

export interface ItineraryActivity {
  id: string;
  label: DataLabel;
  time: string;
  name: string;
  description: string;
  durationMinutes: number;
  address?: string;
  admissionFee?: Money;
  tips?: string;
}

export interface ItineraryMeal {
  id: string;
  label: DataLabel;
  time: string;
  restaurantName: string;
  cuisine: string;
  estimatedCost: Money;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  address?: string;
}

export interface ItineraryTransport {
  id: string;
  label: DataLabel;
  from: string;
  to: string;
  mode: string;
  durationMinutes: number;
  cost?: Money;
}

export type ItineraryAgentResult = ItineraryResult | DataUnavailable;

/** ── Web Search Results (for advisories, visa, etc.) ────────────────────── */
export interface SearchResult {
  available: true;
  label: DataLabel;
  query: string;
  results: SearchHit[];
}

export interface SearchHit {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string;
}

export type SearchAgentResult = SearchResult | DataUnavailable;
