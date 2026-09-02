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
        maxResults: { type: "number", default: 8 },
        openNow: { type: "boolean" },
        minRating: { type: "number", description: "Minimum rating 1-5" },
      },
      required: ["location"],
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
