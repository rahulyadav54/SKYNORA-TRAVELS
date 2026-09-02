/**
 * Mock Hotel Provider
 */

import { HotelProvider } from "../interfaces";
import { HotelResult } from "../../types/results";
import { HotelSearchInput } from "../../types/tools";

const MOCK_HOTELS = [
  { name: "Grand Hyatt Seoul", stars: 5, amenities: ["pool", "spa", "gym", "restaurant", "wifi"] },
  { name: "Lotte Hotel Seoul", stars: 5, amenities: ["pool", "casino", "restaurant", "wifi"] },
  { name: "Ibis Styles Ambassador Seoul", stars: 3, amenities: ["restaurant", "wifi", "bar"] },
  { name: "Nine Tree Premier Hotel Myeongdong", stars: 4, amenities: ["wifi", "gym", "restaurant"] },
  { name: "Dongdaemun Design Plaza Hotel", stars: 3, amenities: ["wifi", "café"] },
];

function randomBetween(min: number, max: number): number {
  return Math.round(Math.random() * (max - min) + min);
}

function daysBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  return Math.max(1, Math.round((b - a) / 86400000));
}

export class MockHotelProvider implements HotelProvider {
  readonly name = "MockHotelProvider";

  async searchHotels(input: HotelSearchInput): Promise<HotelResult> {
    await new Promise((r) => setTimeout(r, 120));

    const retrievedAt = new Date().toISOString();
    const nights = daysBetween(input.checkIn, input.checkOut);

    const hotels = MOCK_HOTELS.slice(0, Math.min(input.maxResults ?? 5, MOCK_HOTELS.length)).map((h, i) => {
      const pricePerNight = randomBetween(2500, 18000);
      const totalPrice = pricePerNight * nights * (input.rooms ?? 1);

      return {
        id: `MOCK-HT-${i + 1}-${Date.now()}`,
        label: {
          dataType: "live" as const,
          source: "MockHotelProvider (sandbox)",
          retrievedAt,
        },
        name: h.name,
        address: `${input.cityCode} City Centre, Area ${i + 1}`,
        stars: h.stars,
        rating: parseFloat((Math.random() * 2 + 7).toFixed(1)),
        reviewCount: randomBetween(100, 5000),
        pricePerNight: { amount: pricePerNight, currency: "INR" },
        totalPrice: { amount: totalPrice, currency: "INR" },
        amenities: h.amenities,
      };
    });

    return {
      available: true,
      label: {
        dataType: "live",
        source: "MockHotelProvider (sandbox)",
        retrievedAt,
      },
      hotels,
      searchParams: input,
    };
  }
}
