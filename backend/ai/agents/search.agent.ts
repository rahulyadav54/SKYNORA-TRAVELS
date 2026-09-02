/**
 * Search Agent — for advisories, visa info, etc.
 */

import { ProviderRegistry } from "../providers/interfaces";
import { SearchAgentResult } from "../types/results";
import { WebSearchInputSchema } from "../types/tools";

export class SearchAgent {
  constructor(private providers: ProviderRegistry) {}

  async search(rawInput: unknown): Promise<SearchAgentResult> {
    const input = WebSearchInputSchema.parse(rawInput);
    return this.providers.search.search(input);
  }
}
