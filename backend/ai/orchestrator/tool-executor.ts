/**
 * Shared tool execution layer — used by both Anthropic and Gemini orchestrators.
 */

import { ProviderRegistry } from "../providers/interfaces";
import { ConversationSession } from "../types/session";
import { FlightAgent } from "../agents/flight.agent";
import { HotelAgent } from "../agents/hotel.agent";
import { WeatherAgent } from "../agents/weather.agent";
import { CurrencyAgent } from "../agents/currency.agent";
import { DestinationAgent } from "../agents/destination.agent";
import { RestaurantAgent } from "../agents/restaurant.agent";
import { TransportAgent } from "../agents/transport.agent";
import { BudgetAgent } from "../agents/budget.agent";
import { SearchAgent } from "../agents/search.agent";
import { ItineraryAgent } from "../agents/itinerary.agent";
import { FlightStatusAgent } from "../agents/flight-status.agent";
import { AdaptItineraryAgent, AdaptReason } from "../agents/adapt-itinerary.agent";
import { ItineraryDay } from "../types/results";
import { resolveAirportCode, resolveCityCode, resolveLocation } from "../engine/location";
import { maxPlacesForTime, orderByProximity } from "../engine/route-optimizer";
import { Attraction, Restaurant, isDataUnavailable } from "../types/results";

export class ToolExecutor {
  private agents: {
    flight: FlightAgent;
    hotel: HotelAgent;
    weather: WeatherAgent;
    currency: CurrencyAgent;
    destination: DestinationAgent;
    restaurant: RestaurantAgent;
    transport: TransportAgent;
    budget: BudgetAgent;
    search: SearchAgent;
    itinerary: ItineraryAgent;
    flightStatus: FlightStatusAgent;
    adaptItinerary: AdaptItineraryAgent;
  };

  constructor(providers: ProviderRegistry) {
    this.agents = {
      flight: new FlightAgent(providers),
      hotel: new HotelAgent(providers),
      weather: new WeatherAgent(providers),
      currency: new CurrencyAgent(providers),
      destination: new DestinationAgent(providers),
      restaurant: new RestaurantAgent(providers),
      transport: new TransportAgent(providers),
      budget: new BudgetAgent(providers),
      search: new SearchAgent(providers),
      itinerary: new ItineraryAgent(),
      flightStatus: new FlightStatusAgent(),
      adaptItinerary: new AdaptItineraryAgent(),
    };
  }

  restaurantOpts(session: ConversationSession, input: Record<string, unknown>) {
    const loc = session.constraints.userLocation;
    return {
      maxBudgetPerPerson: input.maxBudgetPerPerson != null ? Number(input.maxBudgetPerPerson) : undefined,
      userLat: loc?.lat,
      userLng: loc?.lng,
    };
  }

  resolveSearchLocation(location: string, session: ConversationSession): string {
    const loc = (location || "").toLowerCase();
    if (
      (loc === "current" || loc === "near me" || loc.includes("my location") || loc === "here") &&
      session.constraints.userLocation
    ) {
      const { lat, lng, label } = session.constraints.userLocation;
      return label || `${lat},${lng}`;
    }
    return location;
  }

  collectSessionPlaces(session: ConversationSession): { attractions: Attraction[]; restaurants: Restaurant[] } {
    const attractions: Attraction[] = [];
    const restaurants: Restaurant[] = [];

    for (const call of session.toolCallLog) {
      if (isDataUnavailable(call.output)) continue;
      if (call.toolName === "search_attractions" || call.toolName === "search_nearby_services" || call.toolName === "search_timeboxed_nearby") {
        const items = (call.output as { attractions?: Attraction[] }).attractions;
        if (items) attractions.push(...items);
      }
      if (call.toolName === "search_restaurants") {
        const items = (call.output as { restaurants?: Restaurant[] }).restaurants;
        if (items) restaurants.push(...items);
      }
    }

    return { attractions, restaurants };
  }

  async execute(
    toolName: string,
    input: Record<string, unknown>,
    session: ConversationSession
  ): Promise<unknown> {
    switch (toolName) {
      case "resolve_location": {
        const resolved = await resolveLocation(String(input.location));
        const ok = !!(resolved.airportCode || resolved.cityCode);
        if (!ok) {
          return {
            available: false,
            reason: `Could not resolve "${input.location}" to airport/city codes. Ask user for nearest major city or a 3-letter IATA code.`,
            provider: resolved.source,
            attemptedAt: resolved.retrievedAt,
            query: resolved.query,
            formattedAddress: resolved.formattedAddress,
          };
        }
        return {
          available: true,
          label: { dataType: "live", source: resolved.source, retrievedAt: resolved.retrievedAt },
          ...resolved,
        };
      }
      case "search_flights": {
        const origin = await resolveAirportCode(String(input.origin));
        const destination = await resolveAirportCode(String(input.destination));
        const maxPrice = input.maxPrice
          ? { amount: Number(input.maxPrice), currency: "INR" }
          : undefined;
        return this.agents.flight.search({
          origin,
          destination,
          departureDate: String(input.departureDate),
          returnDate: input.returnDate ? String(input.returnDate) : undefined,
          adults: Number(input.adults ?? 1),
          cabinClass: (input.cabinClass as "ECONOMY") ?? "ECONOMY",
          maxResults: Number(input.maxResults ?? 5),
          nonstopOnly: Boolean(input.nonstopOnly),
          maxPrice,
          maxStops: input.maxStops != null ? Number(input.maxStops) : undefined,
          sortBy: input.sortBy ? String(input.sortBy) : "cheapest",
          dateFlexDays: input.dateFlexDays != null ? Math.min(3, Number(input.dateFlexDays)) : 0,
        });
      }
      case "search_hotels": {
        const cityCode = await resolveCityCode(String(input.cityCode ?? input.location ?? session.constraints.destination ?? ""));
        return this.agents.hotel.search({
          cityCode,
          checkIn: String(input.checkIn),
          checkOut: String(input.checkOut),
          adults: Number(input.adults ?? 1),
          rooms: Number(input.rooms ?? 1),
          minStars: input.minStars != null ? Number(input.minStars) : undefined,
          maxPricePerNight: input.maxPricePerNight
            ? { amount: Number(input.maxPricePerNight), currency: "INR" }
            : undefined,
          maxTotalStayCost: input.maxTotalStayCost
            ? { amount: Number(input.maxTotalStayCost), currency: "INR" }
            : undefined,
          minRating: input.minRating != null ? Number(input.minRating) : undefined,
          sortBy: input.sortBy ? String(input.sortBy) : "cheapest",
          freeCancellation: Boolean(input.freeCancellation),
          maxResults: Number(input.maxResults ?? 5),
        });
      }
      case "get_weather":
        return this.agents.weather.getForecast(input);
      case "get_exchange_rate":
        return this.agents.currency.getRate(input);
      case "search_attractions":
        return this.agents.destination.searchAttractions({
          ...input,
          location: this.resolveSearchLocation(String(input.location ?? ""), session),
        });
      case "search_restaurants":
        return this.agents.restaurant.search(
          {
            ...input,
            location: this.resolveSearchLocation(String(input.location ?? ""), session),
          },
          this.restaurantOpts(session, input)
        );
      case "search_timeboxed_nearby": {
        const hours = Number(input.hoursAvailable ?? 3);
        const location = this.resolveSearchLocation(String(input.location ?? "current"), session);
        const cap = maxPlacesForTime(hours);
        const maxResults = Math.min(Number(input.maxResults ?? cap), cap);
        const result = await this.agents.destination.searchAttractions({
          location,
          categories: input.categories as string[] | undefined,
          radius: Number(input.radius ?? 2000),
          maxResults: Number(input.maxResults ?? 8),
          openNow: true,
        });
        if (!result.available) return result;
        const ordered = orderByProximity(result.attractions).slice(0, maxResults);
        return {
          ...result,
          attractions: ordered,
          timeboxed: {
            hoursAvailable: hours,
            maxPlacesRecommended: maxResults,
            location,
          },
        };
      }
      case "search_nearby_services":
        return this.agents.destination.searchNearbyServices(input);
      case "compare_transport_modes":
        return this.agents.transport.compareModes({
          from: String(input.from),
          to: String(input.to),
          mode: "transit",
        });
      case "check_flight_status":
        return await this.agents.flightStatus.check({
          flightNumber: String(input.flightNumber),
          date: String(input.date),
          origin: input.origin ? String(input.origin) : undefined,
          destination: input.destination ? String(input.destination) : undefined,
        });
      case "adapt_itinerary": {
        let days = (session.tripPlan?.itinerary || []) as unknown as ItineraryDay[];
        if (!days.length) {
          const built = await this.execute("build_itinerary", {
            startDate: String(input.startDate || session.constraints.departureDate || new Date().toISOString().slice(0, 10)),
            days: Number(input.days || session.constraints.tripDurationDays || 3),
            useSessionData: true,
          }, session);
          if (isDataUnavailable(built) || !Array.isArray((built as { days?: ItineraryDay[] }).days)) {
            return {
              available: false,
              reason: "No itinerary to adapt. Search attractions/restaurants and run build_itinerary first.",
              provider: "AdaptItineraryAgent",
              attemptedAt: new Date().toISOString(),
            };
          }
          days = (built as { days: ItineraryDay[] }).days;
        }
        const { attractions } = this.collectSessionPlaces(session);
        return this.agents.adaptItinerary.adapt({
          days,
          reason: String(input.reason) as AdaptReason,
          affectedDate: input.affectedDate ? String(input.affectedDate) : undefined,
          closedVenueNames: input.closedVenueNames as string[] | undefined,
          delayHours: input.delayHours != null ? Number(input.delayHours) : undefined,
          notes: input.notes ? String(input.notes) : undefined,
          indoorAlternatives: attractions,
        });
      }
      case "get_transport_directions":
        return this.agents.transport.getDirections(input);
      case "search_travel_info":
        return this.agents.search.search(input);
      case "calculate_budget": {
        const currency = String(input.currency ?? "INR");
        const money = (amount: unknown) => ({ amount: Number(amount ?? 0), currency });
        return this.agents.budget.calculate({
          totalBudget: money(input.totalBudget),
          flightsCost: money(input.flightsCost),
          hotelsCost: money(input.hotelsCost),
          foodCost: money(input.foodCost),
          transportCost: money(input.transportCost),
          activitiesCost: money(input.activitiesCost),
          miscCost: money(input.miscCost),
          totalDays: Number(input.totalDays ?? session.constraints.tripDurationDays ?? 1),
          adults: Number(input.adults ?? session.constraints.adults ?? 1),
        });
      }
      case "build_itinerary": {
        const { attractions, restaurants } = input.useSessionData !== false
          ? this.collectSessionPlaces(session)
          : { attractions: [], restaurants: [] };
        return this.agents.itinerary.build({
          startDate: String(input.startDate),
          days: Number(input.days),
          attractions,
          restaurants,
          currency: String(input.currency ?? session.constraints.budgetTotal?.currency ?? "INR"),
        });
      }
      default:
        return { available: false, reason: `Unknown tool: ${toolName}`, attemptedAt: new Date().toISOString() };
    }
  }
}
