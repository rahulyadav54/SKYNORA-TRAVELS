/** Deterministic itinerary composer with route optimization. */
import { ItineraryAgentResult, Attraction, Restaurant, TransportOption } from "../types/results";
import { Money } from "../types/trip";
import { orderByProximity } from "../engine/route-optimizer";

export interface ItineraryInput {
  startDate: string;
  days: number;
  attractions: Attraction[];
  restaurants: Restaurant[];
  transport?: TransportOption[];
  currency: string;
}

export class ItineraryAgent {
  build(input: ItineraryInput): ItineraryAgentResult {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate) || !Number.isInteger(input.days) || input.days < 1) {
      return { available: false, reason: "A valid start date and at least one day are required", provider: "ItineraryAgent", attemptedAt: new Date().toISOString() };
    }
    if (!input.attractions.length && !input.restaurants.length) {
      return { available: false, reason: "No sourced attractions or restaurants are available to build an itinerary", provider: "ItineraryAgent", attemptedAt: new Date().toISOString() };
    }

    const orderedAttractions = orderByProximity(input.attractions);
    const orderedRestaurants = orderByProximity(
      input.restaurants.map((r) => ({
        ...r,
        latitude: r.latitude,
        longitude: r.longitude,
      }))
    );

    const zero: Money = { amount: 0, currency: input.currency };
    const date = new Date(`${input.startDate}T00:00:00Z`);
    const label = { dataType: "ai_recommended" as const, source: "SkyNora itinerary composer (route-optimized)", retrievedAt: new Date().toISOString() };
    let total = 0;

    const days = Array.from({ length: input.days }, (_, index) => {
      const attraction = orderedAttractions[index % orderedAttractions.length];
      const restaurant = orderedRestaurants.length ? orderedRestaurants[index % orderedRestaurants.length] : undefined;
      const transport = input.transport?.length ? input.transport[index % input.transport.length] : undefined;
      const admissionFee = attraction?.admissionFee;
      const transportFare = transport?.cost;
      const activityCost = admissionFee?.currency === input.currency ? admissionFee.amount : 0;
      const transportCost = transportFare?.currency === input.currency ? transportFare.amount : 0;
      total += activityCost + transportCost;
      const currentDate = new Date(date);
      currentDate.setUTCDate(date.getUTCDate() + index);

      return {
        date: currentDate.toISOString().slice(0, 10),
        dayNumber: index + 1,
        theme: attraction?.category || "Flexible exploration",
        activities: attraction
          ? [{
            id: attraction.id,
            label: attraction.label,
            time: "10:00",
            name: attraction.name,
            description: attraction.description,
            durationMinutes: 120,
            address: attraction.address,
            admissionFee: attraction.admissionFee,
          }]
          : [],
        meals: restaurant
          ? [{
            id: restaurant.id,
            label: restaurant.label,
            time: "13:00",
            restaurantName: restaurant.name,
            cuisine: restaurant.cuisine,
            estimatedCost: zero,
            mealType: "lunch" as const,
            address: restaurant.address,
          }]
          : [],
        transport: transport
          ? [{
            id: transport.id,
            label: transport.label,
            from: "Previous stop",
            to: attraction?.name || restaurant?.name || "Destination",
            mode: transport.mode,
            durationMinutes: transport.durationMinutes,
            cost: transport.cost,
          }]
          : [],
        estimatedCost: { amount: activityCost + transportCost, currency: input.currency },
      };
    });

    return {
      available: true,
      label,
      days,
      totalDays: input.days,
      totalEstimatedCost: { amount: total, currency: input.currency },
      optimizationNote: "Places ordered to reduce backtracking using nearest-neighbor routing.",
    };
  }
}
