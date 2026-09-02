/**
 * Transport Agent
 */

import { ProviderRegistry } from "../providers/interfaces";
import { TransportAgentResult } from "../types/results";
import { TransportInputSchema } from "../types/tools";

export class TransportAgent {
  constructor(private providers: ProviderRegistry) {}

  async getDirections(rawInput: unknown): Promise<TransportAgentResult> {
    const input = TransportInputSchema.parse(rawInput);
    return this.providers.places.getDirections(input);
  }
}
