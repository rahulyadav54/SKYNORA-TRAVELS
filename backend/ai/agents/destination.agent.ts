/**
 * Destination / Attraction Agent
 */

import { ProviderRegistry } from "../providers/interfaces";
import { DestinationAgentResult } from "../types/results";
import { PlacesSearchInputSchema } from "../types/tools";

const SERVICE_CATEGORIES: Record<string, string[]> = {
  cafe: ["cafe"],
  hospital: ["hospital"],
  pharmacy: ["pharmacy"],
  atm: ["atm"],
  supermarket: ["supermarket", "grocery_or_supermarket"],
  train_station: ["train_station"],
  bus_station: ["bus_station"],
  attraction: ["tourist_attraction", "museum", "park"],
};

export class DestinationAgent {
  constructor(private providers: ProviderRegistry) {}

  async searchAttractions(rawInput: unknown): Promise<DestinationAgentResult> {
    const input = PlacesSearchInputSchema.parse(rawInput);
    return this.providers.places.searchAttractions(input);
  }

  async searchNearbyServices(rawInput: unknown): Promise<DestinationAgentResult> {
    const input = rawInput as {
      location: string;
      serviceType: string;
      radius?: number;
      maxResults?: number;
      openNow?: boolean;
    };
    const categories = SERVICE_CATEGORIES[input.serviceType] ?? ["point_of_interest"];
    return this.providers.places.searchAttractions({
      location: input.location,
      categories,
      radius: input.radius ?? 1000,
      maxResults: input.maxResults ?? 8,
      openNow: input.openNow,
    });
  }
}
