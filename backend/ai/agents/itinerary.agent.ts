/** Deterministic itinerary composer. It schedules only supplied, sourced data. */
import { ItineraryAgentResult, Attraction, Restaurant, TransportOption } from "../types/results";
import { Money } from "../types/trip";

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

    const zero: Money = { amount: 0, currency: input.currency };
    const date = new Date(`${input.startDate}T00:00:00Z`);
    const label = { dataType: "ai_recommended" as const, source: "SkyNora itinerary composer", retrievedAt: new Date().toISOString() };
    let total = 0;
    const days = Array.from({ length: input.days }, (_, index) => {
      const attraction = input.attractions[index % input.attractions.length];
      const restaurant = input.restaurants.length ? input.restaurants[index % input.restaurants.length] : undefined;
      const transport = input.transport?.length ? input.transport[index % input.transport.length] : undefined;
      const admissionFee = attraction?.admissionFee;
      const transportFare = transport?.cost;
      const activityCost = admissionFee?.currency === input.currency ? admissionFee.amount : 0;
      const transportCost = transportFare?.currency === input.currency ? transportFare.amount : 0;
      total += activityCost + transportCost;
      const currentDate = new Date(date);
      currentDate.setUTCDate(date.getUTCDate() + index);
      return {
        date: currentDate.toISOString().slice(0, 10), dayNumber: index + 1, theme: attraction?.category || "Flexible exploration",
        activities: attraction ? [{ id: attraction.id, label: attraction.label, time: "10:00", name: attraction.name, description: attraction.description, durationMinutes: 120, address: attraction.address, admissionFee: attraction.admissionFee }] : [],
        meals: restaurant ? [{ id: restaurant.id, label: restaurant.label, time: "13:00", restaurantName: restaurant.name, cuisine: restaurant.cuisine, estimatedCost: zero, mealType: "lunch" as const, address: restaurant.address }] : [],
        transport: transport ? [{ id: transport.id, label: transport.label, from: "Previous stop", to: attraction?.name || restaurant?.name || "Destination", mode: transport.mode, durationMinutes: transport.durationMinutes, cost: transport.cost }] : [],
        estimatedCost: { amount: activityCost + transportCost, currency: input.currency },
      };
    });
    return { available: true, label, days, totalDays: input.days, totalEstimatedCost: { amount: total, currency: input.currency } };
  }
}
