/**
 * randomapi.dev — free public flight fixtures (no API key).
 * https://randomapi.dev/apis/flights
 */

import axios from "axios";
import { FlightProvider } from "../interfaces";
import { FlightResult } from "../../types/results";
import { FlightSearchInput } from "../../types/tools";

const BASE = process.env.RANDOMAPI_BASE_URL || "https://randomapi.dev";

export class RandomApiFlightAdapter implements FlightProvider {
  readonly name = "RandomAPI Flights";

  async searchFlights(input: FlightSearchInput): Promise<FlightResult> {
    const retrievedAt = new Date().toISOString();
    const count = Math.min(input.maxResults ?? 5, 10);

    try {
      const { data } = await axios.get(`${BASE}/api/flights`, {
        params: {
          origin: input.origin,
          destination: input.destination,
          count,
          seed: hashSeed(`${input.origin}-${input.destination}-${input.departureDate}`),
        },
        timeout: 15000,
      });

      const rows = Array.isArray(data?.data) ? data.data : [];
      if (!rows.length) {
        return {
          available: false,
          reason: `No flights found for ${input.origin} → ${input.destination} on RandomAPI`,
          provider: this.name,
          attemptedAt: retrievedAt,
        };
      }

      const label = {
        dataType: "estimated" as const,
        source: "randomapi.dev (fictional flight fixtures)",
        retrievedAt,
      };

      const flights = rows.map((row: Record<string, unknown>, i: number) => {
        const airline = row.airline as Record<string, string> | undefined;
        const origin = row.origin as Record<string, string> | undefined;
        const dest = row.destination as Record<string, string> | undefined;
        const duration = Number(row.durationMinutes ?? 120);
        const priceInr = estimateInrPrice(duration, input.origin, input.destination);

        return {
          id: String(row.id ?? `rnd-${i}-${Date.now()}`),
          label,
          airline: airline?.name?.replace(" (fictional)", "") ?? airline?.code ?? "Airline",
          flightNumber: String(row.flightNumber ?? `${airline?.code ?? "XX"}${1000 + i}`),
          origin: origin?.iata ?? input.origin,
          destination: dest?.iata ?? input.destination,
          departureAt: String(row.departure ?? `${input.departureDate}T06:00:00.000Z`),
          arrivalAt: String(row.arrival ?? `${input.departureDate}T10:00:00.000Z`),
          durationMinutes: duration,
          stops: 0,
          price: { amount: priceInr, currency: "INR" },
          cabinClass: input.cabinClass,
        };
      });

      return {
        available: true,
        label,
        flights,
        searchParams: input,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        available: false,
        reason: `RandomAPI error: ${message}`,
        provider: this.name,
        attemptedAt: retrievedAt,
      };
    }
  }
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 10000;
  return h || 42;
}

function estimateInrPrice(durationMinutes: number, origin: string, dest: string): number {
  const base = 3500 + durationMinutes * 45;
  const intl = origin[0] !== dest[0] ? 12000 : 0;
  return Math.round(base + intl);
}
