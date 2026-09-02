/**
 * Amadeus Flight Adapter — real implementation.
 * Only loaded when AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET are set.
 */

import axios from "axios";
import NodeCache from "node-cache";
import { FlightProvider } from "../interfaces";
import { FlightResult } from "../../types/results";
import { FlightSearchInput } from "../../types/tools";

const cache = new NodeCache({ stdTTL: 300 }); // 5-minute cache

export class AmadeusFlightAdapter implements FlightProvider {
  readonly name = "Amadeus";
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.clientId = process.env.AMADEUS_CLIENT_ID!;
    this.clientSecret = process.env.AMADEUS_CLIENT_SECRET!;
    this.baseUrl =
      process.env.AMADEUS_ENV === "production"
        ? "https://api.amadeus.com"
        : "https://test.api.amadeus.com";
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 30000) {
      return this.accessToken;
    }
    const res = await axios.post(
      `${this.baseUrl}/v1/security/oauth2/token`,
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    this.accessToken = res.data.access_token as string;
    this.tokenExpiresAt = Date.now() + res.data.expires_in * 1000;
    return this.accessToken;
  }

  async searchFlights(input: FlightSearchInput): Promise<FlightResult> {
    const cacheKey = `flight:${JSON.stringify(input)}`;
    const cached = cache.get<FlightResult>(cacheKey);
    if (cached) return cached;

    const retrievedAt = new Date().toISOString();
    try {
      const token = await this.getAccessToken();
      const params: Record<string, string> = {
        originLocationCode: input.origin,
        destinationLocationCode: input.destination,
        departureDate: input.departureDate,
        adults: String(input.adults),
        travelClass: input.cabinClass,
        max: String(input.maxResults ?? 5),
        currencyCode: "INR",
      };
      if (input.returnDate) params.returnDate = input.returnDate;
      if (input.nonstopOnly) params.nonStop = "true";

      const res = await axios.get(`${this.baseUrl}/v2/shopping/flight-offers`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });

      const offers = (res.data.data ?? []).slice(0, input.maxResults ?? 5);
      const flights = offers.map((offer: Record<string, unknown>, i: number) => {
        const itin = (offer.itineraries as Record<string, unknown>[])[0];
        const segments = (itin.segments as Record<string, unknown>[]);
        const first = segments[0] as Record<string, unknown>;
        const last = segments[segments.length - 1] as Record<string, unknown>;
        const price = offer.price as Record<string, unknown>;
        return {
          id: offer.id as string,
          label: { dataType: "live" as const, source: "Amadeus API", retrievedAt },
          airline: (first.carrierCode as string),
          flightNumber: `${first.carrierCode}${first.number}`,
          origin: (first.departure as Record<string, unknown>).iataCode as string,
          destination: (last.arrival as Record<string, unknown>).iataCode as string,
          departureAt: (first.departure as Record<string, unknown>).at as string,
          arrivalAt: (last.arrival as Record<string, unknown>).at as string,
          durationMinutes: parseDuration(itin.duration as string),
          stops: segments.length - 1,
          price: { amount: parseFloat(price.grandTotal as string), currency: price.currency as string },
          cabinClass: input.cabinClass,
          seatsAvailable: (offer.numberOfBookableSeats as number),
        };
      });

      const result: FlightResult = {
        available: true,
        label: { dataType: "live", source: "Amadeus API", retrievedAt },
        flights,
        searchParams: input,
      };
      cache.set(cacheKey, result);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        available: false,
        reason: `Amadeus API error: ${message}`,
        provider: "Amadeus",
        attemptedAt: retrievedAt,
      };
    }
  }
}

function parseDuration(iso: string): number {
  // PT2H30M → 150 minutes
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;
  return (parseInt(match[1] ?? "0") * 60) + parseInt(match[2] ?? "0");
}
