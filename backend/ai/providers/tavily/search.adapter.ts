/**
 * Tavily Web Search Adapter
 */

import axios from "axios";
import { SearchProvider } from "../interfaces";
import { SearchAgentResult } from "../../types/results";
import { WebSearchInput } from "../../types/tools";

export class TavilySearchAdapter implements SearchProvider {
  readonly name = "Tavily";
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.TAVILY_API_KEY!;
  }

  async search(input: WebSearchInput): Promise<SearchAgentResult> {
    const retrievedAt = new Date().toISOString();
    try {
      const res = await axios.post(
        "https://api.tavily.com/search",
        {
          api_key: this.apiKey,
          query: input.query,
          max_results: input.maxResults ?? 5,
          search_depth: "basic",
        }
      );

      const results = ((res.data.results as Record<string, unknown>[]) ?? []).map((r) => ({
        title: r.title as string,
        url: r.url as string,
        snippet: r.content as string,
        publishedAt: r.published_date as string | undefined,
      }));

      return {
        available: true,
        label: { dataType: "live", source: "Tavily Search API", retrievedAt },
        query: input.query,
        results,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { available: false, reason: `Tavily error: ${message}`, provider: "Tavily", attemptedAt: retrievedAt };
    }
  }
}
