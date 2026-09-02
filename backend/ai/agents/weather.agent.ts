/**
 * Weather Agent
 */

import { ProviderRegistry } from "../providers/interfaces";
import { WeatherAgentResult } from "../types/results";
import { WeatherInputSchema } from "../types/tools";

export class WeatherAgent {
  constructor(private providers: ProviderRegistry) {}

  async getForecast(rawInput: unknown): Promise<WeatherAgentResult> {
    const input = WeatherInputSchema.parse(rawInput);
    return this.providers.weather.getForecast(input);
  }
}
