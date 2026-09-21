/**
 * Tool definitions passed to Claude's tools array.
 * These are the structured function signatures Claude uses to decide which agent to call.
 * The LLM reasons about WHICH tool to call; the agents actually execute it.
 */

import Anthropic from "@anthropic-ai/sdk";

export const TRAVEL_TOOLS: Anthropic.Tool[] = [
  {
    name: "search_flights",
    description: "Search for available flights between two cities on specific dates. Use this for any flight availability, pricing, or schedule questions. Returns live data with pricing in INR.",
    input_schema: {
      type: "object",
      properties: {
        origin: { type: "string", description: "Origin airport IATA code (e.g., MAA for Chennai, DEL for Delhi)" },
        destination: { type: "string", description: "Destination airport IATA code (e.g., ICN for Seoul, NRT for Tokyo)" },
        departureDate: { type: "string", description: "Departure date in YYYY-MM-DD format" },
        returnDate: { type: "string", description: "Return date in YYYY-MM-DD format (for round trips)" },
        adults: { type: "number", description: "Number of adult passengers", default: 1 },
        cabinClass: { type: "string", enum: ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"], default: "ECONOMY" },
        maxResults: { type: "number", description: "Maximum results to return", default: 5 },
        nonstopOnly: { type: "boolean", description: "If true, return only direct flights", default: false },
        maxStops: { type: "number", description: "Maximum number of stops (e.g. 1 for one-stop flights)" },
        maxPrice: { type: "number", description: "Maximum price per person in INR" },
        sortBy: { type: "string", enum: ["cheapest", "fastest", "best_value"], description: "How to rank results", default: "cheapest" },
        dateFlexDays: { type: "number", description: "Search ±N days around departureDate for flexible dates (max 3)", default: 0 },
      },
      required: ["origin", "destination", "departureDate"],
    },
  },
  {
    name: "search_hotels",
    description: "Search for hotels in a city for specific dates. Returns live pricing and availability.",
    input_schema: {
      type: "object",
      properties: {
        cityCode: { type: "string", description: "City IATA code (e.g., SEL for Seoul, TYO for Tokyo)" },
        checkIn: { type: "string", description: "Check-in date YYYY-MM-DD" },
        checkOut: { type: "string", description: "Check-out date YYYY-MM-DD" },
        adults: { type: "number", default: 1 },
        rooms: { type: "number", default: 1 },
        minStars: { type: "number", description: "Minimum star rating 1-5" },
        maxPricePerNight: { type: "number", description: "Maximum price per night in INR" },
        maxTotalStayCost: { type: "number", description: "Maximum total stay cost in INR" },
        minRating: { type: "number", description: "Minimum guest rating (0-10)" },
        sortBy: { type: "string", enum: ["cheapest", "rating", "best_value"], default: "cheapest" },
        freeCancellation: { type: "boolean", description: "Prefer free cancellation where available" },
        maxResults: { type: "number", default: 5 },
      },
      required: ["cityCode", "checkIn", "checkOut"],
    },
  },
  {
    name: "get_weather",
    description: "Get weather forecast for a destination. Use this before recommending outdoor activities or packing advice.",
    input_schema: {
      type: "object",
      properties: {
        location: { type: "string", description: "City name (e.g., Seoul, South Korea)" },
        startDate: { type: "string", description: "Start date YYYY-MM-DD" },
        endDate: { type: "string", description: "End date YYYY-MM-DD" },
        units: { type: "string", enum: ["metric", "imperial"], default: "metric" },
      },
      required: ["location"],
    },
  },
  {
    name: "get_exchange_rate",
    description: "Get current exchange rate between two currencies. REQUIRED before quoting any price in a different currency. Never hardcode exchange rates.",
    input_schema: {
      type: "object",
      properties: {
        fromCurrency: { type: "string", description: "Source currency ISO 4217 (e.g., INR, USD)" },
        toCurrency: { type: "string", description: "Target currency ISO 4217 (e.g., KRW, USD)" },
        amount: { type: "number", description: "Amount to convert (optional)" },
      },
      required: ["fromCurrency", "toCurrency"],
    },
  },
  {
    name: "search_attractions",
    description: "Search for tourist attractions, landmarks, and activities at a destination.",
    input_schema: {
      type: "object",
      properties: {
        location: { type: "string", description: "Location to search in (e.g., Seoul, South Korea)" },
        categories: {
          type: "array",
          items: { type: "string" },
          description: "Categories like: museum, temple, park, shopping, landmark",
        },
        radius: { type: "number", description: "Search radius in metres (500, 1000, 2000, 5000)", default: 5000 },
        maxResults: { type: "number", default: 8 },
        openNow: { type: "boolean" },
      },
      required: ["location"],
    },
  },
  {
    name: "search_restaurants",
    description: "Search for restaurants at a destination. Use dietary filters to find vegetarian, vegan, or halal options.",
    input_schema: {
      type: "object",
      properties: {
        location: { type: "string", description: "Location to search in" },
        cuisine: { type: "string", description: "Cuisine type (e.g., Korean, Japanese, Indian)" },
        dietary: {
          type: "array",
          items: { type: "string" },
          description: "Dietary requirements: vegetarian, vegan, halal, gluten-free",
        },
        radius: { type: "number", description: "Search radius in metres (500, 1000, 2000)", default: 2000 },
        maxBudgetPerPerson: { type: "number", description: "Max meal budget per person in INR" },
        maxResults: { type: "number", default: 8 },
        openNow: { type: "boolean" },
        minRating: { type: "number", description: "Minimum rating 1-5" },
      },
      required: ["location"],
    },
  },
  {
    name: "search_nearby_services",
    description: "Search for nearby essential services: cafes, hospitals, pharmacies, ATMs, supermarkets, or transport stations.",
    input_schema: {
      type: "object",
      properties: {
        location: { type: "string", description: "Address, landmark, or coordinates" },
        serviceType: {
          type: "string",
          enum: ["cafe", "hospital", "pharmacy", "atm", "supermarket", "train_station", "bus_station", "attraction"],
        },
        radius: { type: "number", description: "Radius in metres", default: 1000 },
        maxResults: { type: "number", default: 8 },
        openNow: { type: "boolean" },
      },
      required: ["location", "serviceType"],
    },
  },
  {
    name: "resolve_location",
    description: "Resolve a place name (e.g. Guindy, Chennai, Seoul) to airport and city IATA codes before searching flights or hotels.",
    input_schema: {
      type: "object",
      properties: {
        location: { type: "string", description: "City, neighbourhood, or landmark name" },
      },
      required: ["location"],
    },
  },
  {
    name: "calculate_budget",
    description: "Calculate total trip budget using the deterministic calculation engine. Use ONLY numbers from prior tool results.",
    input_schema: {
      type: "object",
      properties: {
        totalBudget: { type: "number", description: "Total trip budget amount" },
        currency: { type: "string", description: "Currency code (e.g. INR)", default: "INR" },
        flightsCost: { type: "number", default: 0 },
        hotelsCost: { type: "number", default: 0 },
        foodCost: { type: "number", default: 0 },
        transportCost: { type: "number", default: 0 },
        activitiesCost: { type: "number", default: 0 },
        miscCost: { type: "number", default: 0 },
        totalDays: { type: "number", default: 1 },
        adults: { type: "number", default: 1 },
      },
      required: ["totalBudget"],
    },
  },
  {
    name: "build_itinerary",
    description: "Build a day-by-day itinerary from sourced attractions, restaurants, and transport data already retrieved.",
    input_schema: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "Trip start date YYYY-MM-DD" },
        days: { type: "number", description: "Number of days" },
        currency: { type: "string", default: "INR" },
        useSessionData: { type: "boolean", description: "Use attractions/restaurants from current session", default: true },
      },
      required: ["startDate", "days"],
    },
  },
  {
    name: "search_timeboxed_nearby",
    description: "Find attractions or places visitable within a limited time window (e.g. next 3 hours near a station). Use for during-trip assistance.",
    input_schema: {
      type: "object",
      properties: {
        location: { type: "string", description: "Landmark, address, or 'current' to use user's GPS location" },
        hoursAvailable: { type: "number", description: "Hours available (e.g. 3)", default: 3 },
        categories: {
          type: "array",
          items: { type: "string" },
          description: "museum, temple, park, shopping, landmark",
        },
        radius: { type: "number", description: "Search radius in metres", default: 2000 },
        maxResults: { type: "number", default: 5 },
      },
      required: ["location"],
    },
  },
  {
    name: "compare_transport_modes",
    description: "Compare metro/transit, driving, walking, and cycling between two places. Returns duration, distance, and cost for each mode.",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Starting location" },
        to: { type: "string", description: "Destination location" },
      },
      required: ["from", "to"],
    },
  },
  {
    name: "check_flight_status",
    description: "Check current flight status (on-time, delayed, gate). Use during-trip for flight updates.",
    input_schema: {
      type: "object",
      properties: {
        flightNumber: { type: "string", description: "Flight number e.g. AI302, 6E123" },
        date: { type: "string", description: "Travel date YYYY-MM-DD" },
        origin: { type: "string", description: "Origin airport code (optional)" },
        destination: { type: "string", description: "Destination airport code (optional)" },
      },
      required: ["flightNumber", "date"],
    },
  },
  {
    name: "adapt_itinerary",
    description: "Adapt the current itinerary for bad weather, venue closures, or flight delays. Swaps outdoor activities for indoor alternatives from session data.",
    input_schema: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          enum: ["heavy_rain", "extreme_heat", "closure", "flight_delay", "other"],
          description: "Why the plan needs to change",
        },
        affectedDate: { type: "string", description: "ISO date YYYY-MM-DD to adapt (omit to adapt all days)" },
        closedVenueNames: {
          type: "array",
          items: { type: "string" },
          description: "Names of closed venues when reason is closure",
        },
        delayHours: { type: "number", description: "Flight delay in hours when reason is flight_delay" },
        notes: { type: "string", description: "Extra context for the traveller" },
      },
      required: ["reason"],
    },
  },
  {
    name: "get_transport_directions",
    description: "Get transport options and directions between two places. Use for planning how to get around.",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Starting location" },
        to: { type: "string", description: "Destination location" },
        mode: { type: "string", enum: ["transit", "driving", "walking", "bicycling"], default: "transit" },
      },
      required: ["from", "to"],
    },
  },
  {
    name: "search_travel_info",
    description: "Search the web for travel advisories, visa requirements, opening hours, safety info, or any other information not covered by structured APIs.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query (e.g., 'visa requirements India to South Korea 2025')" },
        maxResults: { type: "number", default: 5 },
      },
      required: ["query"],
    },
  },
];
