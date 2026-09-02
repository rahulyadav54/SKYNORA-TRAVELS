/**
 * Mock Web Search Provider — for advisories, visa, opening hours edge cases.
 */

import { SearchProvider } from "../interfaces";
import { SearchAgentResult } from "../../types/results";
import { WebSearchInput } from "../../types/tools";

const MOCK_RESULTS: Record<string, { title: string; url: string; snippet: string }[]> = {
  "visa india south korea": [
    {
      title: "South Korea Visa for Indian Citizens — Embassy Guide",
      url: "https://overseas.mofa.go.kr/in-en/index.do",
      snippet: "Indian citizens require a visa to enter South Korea. You can apply for a tourist visa (C-3) through the Korean Embassy. Processing time is 3–5 business days.",
    },
    {
      title: "K-ETA — Korean Electronic Travel Authorization",
      url: "https://www.k-eta.go.kr/",
      snippet: "Indian passport holders are NOT eligible for K-ETA as of 2024 and must obtain a full visa prior to travel.",
    },
  ],
  "vegetarian food seoul": [
    {
      title: "Guide to Vegetarian & Vegan Dining in Seoul",
      url: "https://www.happycow.net/asia/south_korea/seoul/",
      snippet: "Seoul has a growing number of vegetarian and vegan restaurants, especially in Itaewon and Mapo districts. Temple food restaurants serve strictly vegetarian Buddhist cuisine.",
    },
  ],
};

function matchMockResults(query: string): { title: string; url: string; snippet: string }[] {
  const lower = query.toLowerCase();
  for (const key of Object.keys(MOCK_RESULTS)) {
    if (key.split(" ").some((word) => lower.includes(word))) {
      return MOCK_RESULTS[key];
    }
  }
  return [
    {
      title: `Search results for: ${query}`,
      url: "https://example.com",
      snippet: `Mock search result for "${query}". In production this would return live results from Tavily/SerpAPI.`,
    },
  ];
}

export class MockSearchProvider implements SearchProvider {
  readonly name = "MockSearchProvider";

  async search(input: WebSearchInput): Promise<SearchAgentResult> {
    await new Promise((r) => setTimeout(r, 200));
    const retrievedAt = new Date().toISOString();
    const results = matchMockResults(input.query).slice(0, input.maxResults ?? 5);

    return {
      available: true,
      label: {
        dataType: "live",
        source: "MockSearchProvider (sandbox)",
        retrievedAt,
      },
      query: input.query,
      results,
    };
  }
}
