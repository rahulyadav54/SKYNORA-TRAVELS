/**
 * Amadeus Hotel Adapter — real implementation.
 */

import axios from "axios";
import NodeCache from "node-cache";
import { HotelProvider } from "../interfaces";
import { HotelResult } from "../../types/results";
import { HotelSearchInput } from "../../types/tools";

const cache = new NodeCache({ stdTTL: 300 });

export class AmadeusHotelAdapter implements HotelProvider {
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

  async searchHotels(input: HotelSearchInput): Promise<HotelResult> {
    const cacheKey = `hotel:${JSON.stringify(input)}`;
    const cached = cache.get<HotelResult>(cacheKey);
    if (cached) return cached;

    const retrievedAt = new Date().toISOString();
    try {
      const token = await this.getAccessToken();

      // Step 1: Get hotel IDs by city
      const listRes = await axios.get(`${this.baseUrl}/v1/reference-data/locations/hotels/by-city`, {
        params: { cityCode: input.cityCode, ratings: input.minStars, hotelSource: "ALL" },
        headers: { Authorization: `Bearer ${token}` },
      });

      const hotelIds = ((listRes.data.data ?? []) as Record<string, unknown>[])
        .slice(0, 20)
        .map((h) => h.hotelId as string)
        .join(",");

      if (!hotelIds) {
        return { available: false, reason: "No hotels found for city code", provider: "Amadeus", attemptedAt: retrievedAt };
      }

      // Step 2: Get offers for those hotels
      const offersRes = await axios.get(`${this.baseUrl}/v3/shopping/hotel-offers`, {
        params: {
          hotelIds,
          checkInDate: input.checkIn,
          checkOutDate: input.checkOut,
          adults: input.adults,
          roomQuantity: input.rooms,
          currency: "INR",
          bestRateOnly: true,
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      const nights = Math.max(1, Math.round(
        (new Date(input.checkOut).getTime() - new Date(input.checkIn).getTime()) / 86400000
      ));

      const hotels = ((offersRes.data.data ?? []) as Record<string, unknown>[])
        .slice(0, input.maxResults ?? 5)
        .map((h: Record<string, unknown>, i: number) => {
          const hotel = h.hotel as Record<string, unknown>;
          const offer = ((h.offers as Record<string, unknown>[])[0]);
          const price = offer.price as Record<string, unknown>;
          const pricePerNight = parseFloat(price.base as string) / nights;
          return {
            id: hotel.hotelId as string ?? `HT-${i}`,
            label: { dataType: "live" as const, source: "Amadeus API", retrievedAt },
            name: hotel.name as string,
            address: ((hotel.address as Record<string, unknown>)?.lines as string[])?.join(", ") ?? "",
            stars: parseInt(String(hotel.rating ?? "3")),
            rating: undefined,
            pricePerNight: { amount: parseFloat(pricePerNight.toFixed(2)), currency: "INR" },
            totalPrice: { amount: parseFloat(price.total as string), currency: "INR" },
            amenities: (hotel.amenities as string[]) ?? [],
          };
        });

      const result: HotelResult = {
        available: true,
        label: { dataType: "live", source: "Amadeus API", retrievedAt },
        hotels,
        searchParams: input,
      };
      cache.set(cacheKey, result);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { available: false, reason: `Amadeus API error: ${message}`, provider: "Amadeus", attemptedAt: retrievedAt };
    }
  }
}
