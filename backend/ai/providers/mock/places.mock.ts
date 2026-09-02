/**
 * Mock Places Provider — handles attractions, restaurants, and directions.
 */

import { PlacesProvider } from "../interfaces";
import {
  DestinationAgentResult, RestaurantAgentResult, TransportAgentResult,
} from "../../types/results";
import { PlacesSearchInput, RestaurantSearchInput, TransportInput } from "../../types/tools";

const MOCK_ATTRACTIONS = [
  { name: "Gyeongbokgung Palace", category: "culture", address: "161 Sajik-ro, Jongno-gu, Seoul", rating: 4.7, reviewCount: 65000 },
  { name: "N Seoul Tower", category: "landmark", address: "105 Namsangongwon-gil, Yongsan-gu, Seoul", rating: 4.5, reviewCount: 42000 },
  { name: "Bukchon Hanok Village", category: "culture", address: "Bukchon-ro, Jongno-gu, Seoul", rating: 4.4, reviewCount: 31000 },
  { name: "Myeongdong Shopping Street", category: "shopping", address: "Myeongdong-gil, Jung-gu, Seoul", rating: 4.2, reviewCount: 55000 },
  { name: "Changdeokgung Palace", category: "culture", address: "99 Yulgok-ro, Jongno-gu, Seoul", rating: 4.6, reviewCount: 28000 },
  { name: "Lotte World", category: "entertainment", address: "240 Olympic-ro, Songpa-gu, Seoul", rating: 4.3, reviewCount: 72000 },
  { name: "Insadong", category: "culture", address: "Insadong-gil, Jongno-gu, Seoul", rating: 4.3, reviewCount: 22000 },
  { name: "Han River Park", category: "nature", address: "Yeouido-dong, Yeongdeungpo-gu, Seoul", rating: 4.5, reviewCount: 18000 },
];

const MOCK_RESTAURANTS = [
  { name: "Jungsik", cuisine: "Korean Fine Dining", address: "11 Seolleung-ro 158-gil, Gangnam-gu", rating: 4.8, priceLevel: 4, dietaryOptions: ["vegetarian options"] },
  { name: "Kwon's Sushi", cuisine: "Japanese", address: "Apgujeong-ro, Gangnam-gu", rating: 4.6, priceLevel: 3, dietaryOptions: [] },
  { name: "Plant Café Seoul", cuisine: "Vegan Korean", address: "Itaewon-ro, Yongsan-gu", rating: 4.5, priceLevel: 2, dietaryOptions: ["vegan", "vegetarian", "gluten-free"] },
  { name: "Tosokchon Samgyetang", cuisine: "Korean Traditional", address: "5 Jahamun-ro 5-gil, Jongno-gu", rating: 4.7, priceLevel: 2, dietaryOptions: [] },
  { name: "The Green Table", cuisine: "International Vegetarian", address: "Mapo-gu, Seoul", rating: 4.4, priceLevel: 2, dietaryOptions: ["vegetarian", "vegan"] },
  { name: "Sanchon", cuisine: "Buddhist Temple Food", address: "14 Insadong 10-gil, Jongno-gu", rating: 4.6, priceLevel: 3, dietaryOptions: ["vegetarian", "vegan"] },
];

export class MockPlacesProvider implements PlacesProvider {
  readonly name = "MockPlacesProvider";

  async searchAttractions(input: PlacesSearchInput): Promise<DestinationAgentResult> {
    await new Promise((r) => setTimeout(r, 120));
    const retrievedAt = new Date().toISOString();

    const attractions = MOCK_ATTRACTIONS.slice(0, Math.min(input.maxResults ?? 8, MOCK_ATTRACTIONS.length)).map((a, i) => ({
      id: `MOCK-ATT-${i + 1}`,
      label: { dataType: "live" as const, source: "MockPlacesProvider (sandbox)", retrievedAt },
      name: a.name,
      category: a.category,
      description: `A popular ${a.category} destination in ${input.location}. Highly recommended by travellers.`,
      address: a.address,
      latitude: 37.5665 + (Math.random() - 0.5) * 0.1,
      longitude: 126.978 + (Math.random() - 0.5) * 0.1,
      rating: a.rating,
      reviewCount: a.reviewCount,
      openingHours: "09:00–18:00",
    }));

    return {
      available: true,
      label: { dataType: "live", source: "MockPlacesProvider (sandbox)", retrievedAt },
      destination: input.location,
      attractions,
    };
  }

  async searchRestaurants(input: RestaurantSearchInput): Promise<RestaurantAgentResult> {
    await new Promise((r) => setTimeout(r, 100));
    const retrievedAt = new Date().toISOString();

    let restaurants = [...MOCK_RESTAURANTS];

    // Filter by dietary if requested
    if (input.dietary && input.dietary.length > 0) {
      restaurants = restaurants.filter((r) =>
        input.dietary!.some((d) => r.dietaryOptions.some((opt) => opt.toLowerCase().includes(d.toLowerCase())))
      );
    }

    if (restaurants.length === 0) {
      // Return the vegan places if dietary filter is too strict
      restaurants = MOCK_RESTAURANTS.filter((r) => r.dietaryOptions.length > 0);
    }

    return {
      available: true,
      label: { dataType: "live", source: "MockPlacesProvider (sandbox)", retrievedAt },
      restaurants: restaurants.slice(0, Math.min(input.maxResults ?? 8, restaurants.length)).map((r, i) => ({
        id: `MOCK-RST-${i + 1}`,
        label: { dataType: "live" as const, source: "MockPlacesProvider (sandbox)", retrievedAt },
        name: r.name,
        cuisine: r.cuisine,
        address: r.address,
        rating: r.rating,
        priceLevel: r.priceLevel as 1 | 2 | 3 | 4,
        openNow: true,
        dietaryOptions: r.dietaryOptions,
      })),
      searchParams: input,
    };
  }

  async getDirections(input: TransportInput): Promise<TransportAgentResult> {
    await new Promise((r) => setTimeout(r, 90));
    const retrievedAt = new Date().toISOString();

    return {
      available: true,
      label: { dataType: "live", source: "MockPlacesProvider (sandbox)", retrievedAt },
      from: input.from,
      to: input.to,
      options: [
        {
          id: "MOCK-TR-1",
          label: { dataType: "live" as const, source: "MockPlacesProvider (sandbox)", retrievedAt },
          mode: "metro",
          durationMinutes: Math.round(Math.random() * 30 + 15),
          distanceKm: parseFloat((Math.random() * 15 + 2).toFixed(1)),
          cost: { amount: 1350, currency: "KRW" },
          steps: [
            `Take Metro Line 2 from ${input.from}`,
            `Transfer at City Hall station`,
            `Arrive at ${input.to}`,
          ],
        },
        {
          id: "MOCK-TR-2",
          label: { dataType: "live" as const, source: "MockPlacesProvider (sandbox)", retrievedAt },
          mode: "taxi",
          durationMinutes: Math.round(Math.random() * 20 + 10),
          distanceKm: parseFloat((Math.random() * 15 + 2).toFixed(1)),
          cost: { amount: 8500, currency: "KRW" },
        },
      ],
    };
  }
}
