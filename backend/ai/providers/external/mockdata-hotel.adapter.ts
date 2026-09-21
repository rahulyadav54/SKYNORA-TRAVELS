/**
 * mockdata.dev — free public hotel fixtures (no API key).
 * https://github.com/usebruno/mockdata.dev
 */

import axios from "axios";
import { HotelProvider } from "../interfaces";
import { HotelResult } from "../../types/results";
import { HotelSearchInput } from "../../types/tools";

const BASE = process.env.MOCKDATA_BASE_URL || "https://www.mockdata.dev";

function daysBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  return Math.max(1, Math.round((b - a) / 86400000));
}

export class MockdataHotelAdapter implements HotelProvider {
  readonly name = "mockdata.dev Hotels";

  async searchHotels(input: HotelSearchInput): Promise<HotelResult> {
    const retrievedAt = new Date().toISOString();
    const nights = daysBetween(input.checkIn, input.checkOut);
    const perPage = Math.min(input.maxResults ?? 5, 15);

    try {
      const { data } = await axios.get(`${BASE}/hotels`, {
        params: { per_page: perPage },
        timeout: 15000,
      });

      const rows = Array.isArray(data) ? data : [];
      if (!rows.length) {
        return {
          available: false,
          reason: "mockdata.dev returned no hotels",
          provider: this.name,
          attemptedAt: retrievedAt,
        };
      }

      const cityNeedle = input.cityCode.toLowerCase();
      const filtered = rows.filter((row: Record<string, unknown>) => {
        const hotel = row.hotel as Record<string, unknown> | undefined;
        const loc = hotel?.location as Record<string, string> | undefined;
        const city = (loc?.city || "").toLowerCase();
        const code = (loc?.cityCode || "").toLowerCase();
        return !cityNeedle || city.includes(cityNeedle) || code.includes(cityNeedle)
          || cityNeedle.includes(city.slice(0, 3));
      });

      const use = filtered.length ? filtered : rows.slice(0, perPage);

      const label = {
        dataType: "estimated" as const,
        source: "mockdata.dev (fictional hotel fixtures)",
        retrievedAt,
      };

      const hotels = use.map((row: Record<string, unknown>, i: number) => {
        const hotel = row.hotel as Record<string, unknown>;
        const loc = hotel.location as Record<string, string>;
        const pricing = row.pricing as Record<string, number | string>;
        const totalUsd = Number(pricing.totalRate ?? 150);
        const perNightUsd = Number(pricing.baseRate ?? totalUsd / nights);
        const inrRate = 83;
        const totalInr = Math.round(totalUsd * inrRate);
        const perNightInr = Math.round(perNightUsd * inrRate);

        return {
          id: `md-hotel-${i}-${Date.now()}`,
          label,
          name: String(hotel.name ?? "Hotel"),
          address: `${loc?.city ?? input.cityCode}, ${loc?.state ?? ""} ${loc?.country ?? ""}`.trim(),
          stars: Number(hotel.starRating ?? 3),
          rating: Number(hotel.starRating ?? 3) * 1.8,
          reviewCount: 100 + i * 47,
          pricePerNight: { amount: perNightInr, currency: "INR" },
          totalPrice: { amount: totalInr, currency: "INR" },
          amenities: Array.isArray(hotel.amenities) ? (hotel.amenities as string[]) : [],
        };
      });

      return {
        available: true,
        label,
        hotels,
        searchParams: input,
        nights,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        available: false,
        reason: `mockdata.dev error: ${message}`,
        provider: this.name,
        attemptedAt: retrievedAt,
      };
    }
  }
}
