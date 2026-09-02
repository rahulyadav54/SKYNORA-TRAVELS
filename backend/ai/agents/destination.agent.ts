/**
 * Destination / Attraction Agent
 */

import { ProviderRegistry } from "../providers/interfaces";
import { DestinationAgentResult } from "../types/results";
import { PlacesSearchInputSchema } from "../types/tools";

export class DestinationAgent {
  constructor(private providers: ProviderRegistry) {}

  async searchAttractions(rawInput: unknown): Promise<DestinationAgentResult> {
    const input = PlacesSearchInputSchema.parse(rawInput);
    return this.providers.places.searchAttractions(input);
  }
}
