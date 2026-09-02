/**
 * Mock Flight Provider — returns realistic fake data.
 * Implements FlightProvider identically to the real Amadeus adapter.
 * Used when AMADEUS_CLIENT_ID is not set in env.
 */

import { FlightProvider } from "../interfaces";
import { FlightResult } from "../../types/results";
import { FlightSearchInput } from "../../types/tools";

const MOCK_AIRLINES = ["IndiGo", "Air India", "Korean Air", "Asiana Airlines", "Air Asia"];
const AIRLINE_CODES: Record<string, string> = {
  "IndiGo": "6E", "Air India": "AI", "Korean Air": "KE",
  "Asiana Airlines": "OZ", "Air Asia": "AK",
};

function randomBetween(min: number, max: number): number {
  return Math.round(Math.random() * (max - min) + min);
}

function addMinutes(isoDate: string, minutes: number): string {
  return new Date(new Date(isoDate).getTime() + minutes * 60000).toISOString();
}

export class MockFlightProvider implements FlightProvider {
  readonly name = "MockFlightProvider";

  async searchFlights(input: FlightSearchInput): Promise<FlightResult> {
    // Simulate a short network delay
    await new Promise((r) => setTimeout(r, 150));

    const retrievedAt = new Date().toISOString();
    const departureBase = `${input.departureDate}T06:00:00.000Z`;

    const flights = Array.from({ length: Math.min(input.maxResults ?? 5, 5) }).map((_, i) => {
      const airline = MOCK_AIRLINES[i % MOCK_AIRLINES.length];
      const durationMins = randomBetween(180, 720);
      const departureAt = addMinutes(departureBase, i * 90);
      const price = randomBetween(8000, 45000);
      const stops = i % 3 === 0 ? 0 : 1;

      return {
        id: `MOCK-FL-${i + 1}-${Date.now()}`,
        label: {
          dataType: "live" as const,
          source: "MockFlightProvider (sandbox)",
          retrievedAt,
        },
        airline,
        flightNumber: `${AIRLINE_CODES[airline] ?? "XX"}${randomBetween(100, 999)}`,
        origin: input.origin,
        destination: input.destination,
        departureAt,
        arrivalAt: addMinutes(departureAt, durationMins),
        durationMinutes: durationMins,
        stops,
        price: { amount: price, currency: "INR" },
        cabinClass: input.cabinClass,
        seatsAvailable: randomBetween(3, 45),
      };
    });

    return {
      available: true,
      label: {
        dataType: "live",
        source: "MockFlightProvider (sandbox)",
        retrievedAt,
      },
      flights,
      searchParams: input,
    };
  }
}
