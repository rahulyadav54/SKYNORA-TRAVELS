/**
 * Travel Orchestrator — the core AI reasoning loop.
 *
 * Flow:
 *  1. User message arrives with session context
 *  2. Claude reasons using TRAVEL_TOOLS definitions — decides which agents to invoke
 *  3. We execute the real tool calls (agents → providers → live APIs)
 *  4. Results (with source + retrievedAt) are returned to Claude
 *  5. Claude assembles the final response — it cannot hallucinate facts because
 *     it only has what the tool calls returned
 *  6. Session state is updated, response is returned to the user
 */

import Anthropic from "@anthropic-ai/sdk";
import { TRAVEL_TOOLS } from "./tools";
import {
  addMessageToSession, buildMessageHistory, logToolCall, updateConstraints,
} from "./memory";
import { extractConstraints } from "./intent";
import { ConversationSession, ToolCallRecord } from "../types/session";
import { ProviderRegistry } from "../providers/interfaces";
import { FlightAgent } from "../agents/flight.agent";
import { HotelAgent } from "../agents/hotel.agent";
import { WeatherAgent } from "../agents/weather.agent";
import { CurrencyAgent } from "../agents/currency.agent";
import { DestinationAgent } from "../agents/destination.agent";
import { RestaurantAgent } from "../agents/restaurant.agent";
import { TransportAgent } from "../agents/transport.agent";
import { BudgetAgent } from "../agents/budget.agent";
import { SearchAgent } from "../agents/search.agent";

const SYSTEM_PROMPT = `You are SkyNora, an expert AI travel planning assistant. You help users plan complete trips including flights, hotels, restaurants, transport, attractions, weather, currency, and budget.

## Critical Rules You Must Always Follow

1. **NEVER INVENT FACTS**: You must NEVER state any price, schedule, flight time, hotel rate, exchange rate, restaurant rating, weather forecast, or opening hours from your training data. Every such fact MUST come from a tool call result. If you don't have tool data for a claim, say "I don't have live data on that — let me search" and call the appropriate tool.

2. **ALWAYS SOURCE YOUR FACTS**: When you present data from tool calls, briefly note the source (e.g., "According to live flight data from Amadeus..." or "Based on current exchange rates...").

3. **FAIL GRACEFULLY**: If a tool returns unavailable data, tell the user clearly: "I wasn't able to retrieve live [flights/hotels/weather] data right now. Here's what I can tell you..." — never substitute a guess.

4. **DETERMINISTIC MATH**: When you need to calculate totals, always use the tool-returned numbers. Do not attempt mental arithmetic on currency conversions — use get_exchange_rate tool first.

5. **BE SPECIFIC AND HELPFUL**: Give specific, actionable recommendations. If the user has dietary restrictions or preferences, actively filter for them using restaurant dietary options.

## Response Style
- Be warm, enthusiastic, and expert
- Structure long responses with clear sections (✈️ Flights, 🏨 Hotels, 🍽 Food, etc.)
- Always mention the data source inline (e.g., "₹18,500 per person (Amadeus, just fetched)")
- For budgets, always use the Calculation Engine output — say "total estimated cost: ₹X"
- Proactively suggest things the user didn't ask about (visa, weather, dietary options)

## Current Date: ${new Date().toISOString().split("T")[0]}
`;

export interface OrchestratorResponse {
  message: string;
  session: ConversationSession;
  toolCallsUsed: ToolCallRecord[];
}

export class TravelOrchestrator {
  private client: Anthropic;
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
  };

  constructor(providers: ProviderRegistry) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set — cannot initialise Travel Orchestrator");
    }
    this.client = new Anthropic({ apiKey });

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
    };
  }

  async chat(
    userMessage: string,
    session: ConversationSession
  ): Promise<OrchestratorResponse> {
    // Add user message to session
    let currentSession = updateConstraints(session, extractConstraints(userMessage));
    currentSession = addMessageToSession(currentSession, "user", userMessage);
    const toolCallsUsed: ToolCallRecord[] = [];

    // Build message history for Claude
    const messages = buildMessageHistory(currentSession);

    let response = await this.client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TRAVEL_TOOLS,
      messages,
    });

    // Agentic loop — keep going until stop_reason is "end_turn"
    while (response.stop_reason === "tool_use") {
      const assistantMessage: Anthropic.MessageParam = {
        role: "assistant",
        content: response.content,
      };

      // Execute all tool calls Claude requested
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type !== "tool_use") continue;

        const startTime = Date.now();
        let toolOutput: unknown;
        let status: ToolCallRecord["status"] = "success";
        let errorMessage: string | undefined;

        try {
          toolOutput = await this.executeTool(block.name, block.input as Record<string, unknown>);
        } catch (err: unknown) {
          status = "error";
          errorMessage = err instanceof Error ? err.message : String(err);
          toolOutput = {
            available: false,
            reason: errorMessage,
            attemptedAt: new Date().toISOString(),
          };
        }

        const durationMs = Date.now() - startTime;
        const outputObj = toolOutput as Record<string, unknown>;

        const record: ToolCallRecord = {
          id: block.id,
          toolName: block.name,
          input: block.input as Record<string, unknown>,
          output: outputObj,
          provider: (outputObj?.label as Record<string, string>)?.source ?? undefined,
          retrievedAt: new Date().toISOString(),
          durationMs,
          status: outputObj?.available === false ? "unavailable" : status,
          errorMessage,
        };

        toolCallsUsed.push(record);
        currentSession = logToolCall(currentSession, record);

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(toolOutput),
        });
      }

      // Continue conversation with tool results
      const updatedMessages: Anthropic.MessageParam[] = [
        ...messages,
        assistantMessage,
        { role: "user", content: toolResults },
      ];

      response = await this.client.messages.create({
        model: "claude-opus-4-5",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: TRAVEL_TOOLS,
        messages: updatedMessages,
      });
    }

    // Extract final text response
    const finalText = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as Anthropic.TextBlock).text)
      .join("\n");

    // Add assistant response to session
    currentSession = addMessageToSession(currentSession, "assistant", finalText, toolCallsUsed);

    return {
      message: finalText,
      session: currentSession,
      toolCallsUsed,
    };
  }

  private async executeTool(
    toolName: string,
    input: Record<string, unknown>
  ): Promise<unknown> {
    switch (toolName) {
      case "search_flights":
        return this.agents.flight.search(input);
      case "search_hotels":
        return this.agents.hotel.search(input);
      case "get_weather":
        return this.agents.weather.getForecast(input);
      case "get_exchange_rate":
        return this.agents.currency.getRate(input);
      case "search_attractions":
        return this.agents.destination.searchAttractions(input);
      case "search_restaurants":
        return this.agents.restaurant.search(input);
      case "get_transport_directions":
        return this.agents.transport.getDirections(input);
      case "search_travel_info":
        return this.agents.search.search(input);
      default:
        return { available: false, reason: `Unknown tool: ${toolName}`, attemptedAt: new Date().toISOString() };
    }
  }
}
