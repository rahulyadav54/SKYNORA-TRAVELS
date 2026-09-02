/**
 * Zod schemas for all tool inputs and outputs.
 * These are the ONLY way agents communicate with the outside world.
 * Validation is enforced at runtime — no unvalidated data reaches the LLM or the user.
 */

import { z } from "zod";

// ── Shared primitives ────────────────────────────────────────────────────────

export const MoneySchema = z.object({
  amount: z.number().finite(),
  currency: z.string().length(3).toUpperCase(), // ISO 4217
});

export const DataLabelSchema = z.object({
  dataType: z.enum(["live", "estimated", "ai_recommended"]),
  source: z.string().optional(),
  retrievedAt: z.string().datetime().optional(),
});

// ── Flight Search Tool ───────────────────────────────────────────────────────

export const FlightSearchInputSchema = z.object({
  origin: z.string().min(3).max(3).toUpperCase(),       // IATA
  destination: z.string().min(3).max(3).toUpperCase(),  // IATA
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  adults: z.number().int().min(1).max(9).default(1),
  cabinClass: z.enum(["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"]).default("ECONOMY"),
  maxResults: z.number().int().min(1).max(20).default(5),
  maxPrice: MoneySchema.optional(),
  nonstopOnly: z.boolean().default(false),
});

export const FlightSearchOutputSchema = z.object({
  available: z.literal(true),
  label: DataLabelSchema,
  flights: z.array(z.object({
    id: z.string(),
    label: DataLabelSchema,
    airline: z.string(),
    flightNumber: z.string(),
    origin: z.string(),
    destination: z.string(),
    departureAt: z.string().datetime(),
    arrivalAt: z.string().datetime(),
    durationMinutes: z.number().int().positive(),
    stops: z.number().int().min(0),
    price: MoneySchema,
    cabinClass: z.string(),
    seatsAvailable: z.number().int().min(0).optional(),
  })),
  searchParams: FlightSearchInputSchema,
});

// ── Hotel Search Tool ────────────────────────────────────────────────────────

export const HotelSearchInputSchema = z.object({
  cityCode: z.string().min(3).max(3).toUpperCase(),  // IATA city code
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).max(8).default(1),
  rooms: z.number().int().min(1).max(5).default(1),
  minStars: z.number().int().min(1).max(5).optional(),
  maxPricePerNight: MoneySchema.optional(),
  maxResults: z.number().int().min(1).max(20).default(5),
});

export const HotelSearchOutputSchema = z.object({
  available: z.literal(true),
  label: DataLabelSchema,
  hotels: z.array(z.object({
    id: z.string(),
    label: DataLabelSchema,
    name: z.string(),
    address: z.string(),
    stars: z.number().int().min(1).max(5),
    rating: z.number().min(0).max(10).optional(),
    pricePerNight: MoneySchema,
    totalPrice: MoneySchema,
    amenities: z.array(z.string()).optional(),
  })),
  searchParams: HotelSearchInputSchema,
});

// ── Weather Tool ─────────────────────────────────────────────────────────────

export const WeatherInputSchema = z.object({
  location: z.string().min(2),   // city name or lat,lon
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  units: z.enum(["metric", "imperial"]).default("metric"),
});

export const WeatherOutputSchema = z.object({
  available: z.literal(true),
  label: DataLabelSchema,
  location: z.string(),
  forecast: z.array(z.object({
    date: z.string(),
    minTemp: z.number(),
    maxTemp: z.number(),
    unit: z.enum(["C", "F"]),
    condition: z.string(),
    precipitationChance: z.number().min(0).max(100),
    humidity: z.number().min(0).max(100),
    icon: z.string(),
  })),
});

// ── Currency Tool ─────────────────────────────────────────────────────────────

export const CurrencyInputSchema = z.object({
  fromCurrency: z.string().length(3).toUpperCase(),
  toCurrency: z.string().length(3).toUpperCase(),
  amount: z.number().positive().optional(),
});

export const CurrencyOutputSchema = z.object({
  available: z.literal(true),
  label: DataLabelSchema,
  fromCurrency: z.string(),
  toCurrency: z.string(),
  rate: z.number().positive(),
  convertedAmount: z.number().optional(),
  rateDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// ── Places / Attractions Tool ─────────────────────────────────────────────────

export const PlacesSearchInputSchema = z.object({
  location: z.string().min(2),
  categories: z.array(z.string()).optional(),  // e.g. ["museum", "temple", "park"]
  radius: z.number().int().min(100).max(50000).default(5000),  // metres
  maxResults: z.number().int().min(1).max(20).default(10),
  openNow: z.boolean().optional(),
});

export const PlacesSearchOutputSchema = z.object({
  available: z.literal(true),
  label: DataLabelSchema,
  places: z.array(z.object({
    id: z.string(),
    label: DataLabelSchema,
    name: z.string(),
    category: z.string(),
    address: z.string(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    rating: z.number().min(0).max(5).optional(),
    reviewCount: z.number().int().optional(),
    openNow: z.boolean().optional(),
    photoUrl: z.string().url().optional(),
  })),
});

// ── Restaurant Search Tool ────────────────────────────────────────────────────

export const RestaurantSearchInputSchema = z.object({
  location: z.string().min(2),
  cuisine: z.string().optional(),
  dietary: z.array(z.string()).optional(),  // e.g. ["vegetarian", "vegan", "halal"]
  radius: z.number().int().min(100).max(10000).default(2000),
  maxResults: z.number().int().min(1).max(20).default(8),
  openNow: z.boolean().optional(),
  minRating: z.number().min(1).max(5).optional(),
});

export const RestaurantSearchOutputSchema = z.object({
  available: z.literal(true),
  label: DataLabelSchema,
  restaurants: z.array(z.object({
    id: z.string(),
    label: DataLabelSchema,
    name: z.string(),
    cuisine: z.string(),
    address: z.string(),
    rating: z.number().min(0).max(5).optional(),
    priceLevel: z.number().int().min(1).max(4).optional(),
    openNow: z.boolean().optional(),
    dietaryOptions: z.array(z.string()).optional(),
  })),
  searchParams: RestaurantSearchInputSchema,
});

// ── Transport Tool ────────────────────────────────────────────────────────────

export const TransportInputSchema = z.object({
  from: z.string().min(2),
  to: z.string().min(2),
  mode: z.enum(["transit", "driving", "walking", "bicycling"]).default("transit"),
  departureTime: z.string().datetime().optional(),
});

export const TransportOutputSchema = z.object({
  available: z.literal(true),
  label: DataLabelSchema,
  from: z.string(),
  to: z.string(),
  options: z.array(z.object({
    id: z.string(),
    label: DataLabelSchema,
    mode: z.string(),
    durationMinutes: z.number().int().positive(),
    distanceKm: z.number().positive(),
    cost: MoneySchema.optional(),
    steps: z.array(z.string()).optional(),
  })),
});

// ── Web Search Tool (advisories, visa, etc.) ──────────────────────────────────

export const WebSearchInputSchema = z.object({
  query: z.string().min(3).max(200),
  maxResults: z.number().int().min(1).max(10).default(5),
});

export const WebSearchOutputSchema = z.object({
  available: z.literal(true),
  label: DataLabelSchema,
  query: z.string(),
  results: z.array(z.object({
    title: z.string(),
    url: z.string().url(),
    snippet: z.string(),
    publishedAt: z.string().optional(),
  })),
});

// ── DataUnavailable schema (shared) ──────────────────────────────────────────

export const DataUnavailableSchema = z.object({
  available: z.literal(false),
  reason: z.string(),
  provider: z.string().optional(),
  attemptedAt: z.string().datetime(),
});

// ── Type exports ──────────────────────────────────────────────────────────────

export type FlightSearchInput = z.infer<typeof FlightSearchInputSchema>;
export type HotelSearchInput = z.infer<typeof HotelSearchInputSchema>;
export type WeatherInput = z.infer<typeof WeatherInputSchema>;
export type CurrencyInput = z.infer<typeof CurrencyInputSchema>;
export type PlacesSearchInput = z.infer<typeof PlacesSearchInputSchema>;
export type RestaurantSearchInput = z.infer<typeof RestaurantSearchInputSchema>;
export type TransportInput = z.infer<typeof TransportInputSchema>;
export type WebSearchInput = z.infer<typeof WebSearchInputSchema>;
