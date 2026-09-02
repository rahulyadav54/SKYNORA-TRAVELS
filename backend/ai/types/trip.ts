/**
 * Core domain types for the AI Travel Agent system.
 * Every time-sensitive fact MUST carry a DataLabel to prove it came from a live source.
 */

/** Tags every fact returned to the user. "live" requires source + retrievedAt. */
export type DataType = "live" | "estimated" | "ai_recommended";

export interface DataLabel {
  dataType: DataType;
  source?: string;        // e.g. "Amadeus API", "OpenWeatherMap", "Google Places"
  retrievedAt?: string;   // ISO 8601 timestamp of the API call
}

/** Represents a structured, serialisable trip plan — the single source of truth for a session. */
export interface TripPlan {
  id: string;
  userId: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;

  /** Extracted from conversation */
  constraints: Constraint;

  /** Structured results from agents (may be partial / in-progress) */
  flights: FlightOption[];
  hotels: HotelOption[];
  itinerary: DayPlan[];
  budgetSummary?: BudgetSummary;

  /** Status of the plan */
  status: "planning" | "complete" | "modified" | "booked";
}

/** All constraints extracted from the user's conversation */
export interface Constraint {
  origin?: string;
  destination?: string;
  departureDate?: string;   // ISO date YYYY-MM-DD
  returnDate?: string;
  tripDurationDays?: number;
  adults?: number;
  children?: number;
  budgetTotal?: Money;
  budgetPerPerson?: Money;
  cabinClass?: "economy" | "premium_economy" | "business" | "first";
  hotelStars?: number;
  dietaryRestrictions?: string[];
  transportPreferences?: string[];  // e.g. ["public_transport", "no_flights"]
  interests?: string[];              // e.g. ["temples", "street_food", "hiking"]
  travelStyle?: "budget" | "moderate" | "luxury";
}

/** A monetary value with mandatory currency code */
export interface Money {
  amount: number;
  currency: string;  // ISO 4217, e.g. "INR", "KRW", "USD"
}

/** A flight option surfaced by the Flight Agent */
export interface FlightOption {
  id: string;
  label: DataLabel;
  airline: string;
  flightNumber: string;
  origin: string;         // IATA code
  destination: string;    // IATA code
  departureAt: string;    // ISO 8601
  arrivalAt: string;      // ISO 8601
  durationMinutes: number;
  stops: number;
  price: Money;
  cabinClass: string;
  seatsAvailable?: number;
  bookingUrl?: string;
}

/** A hotel option surfaced by the Hotel Agent */
export interface HotelOption {
  id: string;
  label: DataLabel;
  name: string;
  address: string;
  stars: number;
  rating?: number;
  reviewCount?: number;
  pricePerNight: Money;
  checkIn: string;
  checkOut: string;
  amenities?: string[];
  bookingUrl?: string;
  latitude?: number;
  longitude?: number;
}

/** A single day in the itinerary */
export interface DayPlan {
  date: string;  // ISO date
  activities: Activity[];
  meals: Meal[];
  transport: TransportLeg[];
  estimatedCost: Money;
}

export interface Activity {
  id: string;
  label: DataLabel;
  name: string;
  description: string;
  startTime?: string;
  durationMinutes?: number;
  cost?: Money;
  address?: string;
  latitude?: number;
  longitude?: number;
  category: "attraction" | "culture" | "nature" | "shopping" | "entertainment";
}

export interface Meal {
  id: string;
  label: DataLabel;
  name: string;
  cuisine: string;
  address?: string;
  estimatedCost?: Money;
  dietaryTags?: string[];
  rating?: number;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
}

export interface TransportLeg {
  id: string;
  label: DataLabel;
  from: string;
  to: string;
  mode: "metro" | "bus" | "taxi" | "walk" | "train" | "ferry" | "flight";
  durationMinutes: number;
  cost?: Money;
  notes?: string;
}

export interface BudgetSummary {
  label: DataLabel;
  totalBudget: Money;
  breakdown: {
    flights: Money;
    hotels: Money;
    food: Money;
    transport: Money;
    activities: Money;
    misc: Money;
  };
  totalSpent: Money;
  remaining: Money;
  perPersonPerDay: Money;
}

/** User preferences saved across sessions */
export interface UserPreferences {
  userId: string;
  preferredCurrency: string;
  dietaryRestrictions: string[];
  seatPreference?: "window" | "aisle" | "middle";
  hotelAmenities?: string[];
  transportPreferences?: string[];
  interests?: string[];
  updatedAt: string;
}
