/**
 * Mock Weather Provider
 */

import { WeatherProvider } from "../interfaces";
import { WeatherAgentResult } from "../../types/results";
import { WeatherInput } from "../../types/tools";

const CONDITIONS = ["Sunny", "Partly Cloudy", "Cloudy", "Light Rain", "Clear", "Overcast"];

function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start);
  const endDate = new Date(end);
  while (current <= endDate) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export class MockWeatherProvider implements WeatherProvider {
  readonly name = "MockWeatherProvider";

  async getForecast(input: WeatherInput): Promise<WeatherAgentResult> {
    await new Promise((r) => setTimeout(r, 100));
    const retrievedAt = new Date().toISOString();

    const start = input.startDate ?? new Date().toISOString().split("T")[0];
    const end = input.endDate ?? new Date(new Date().getTime() + 7 * 86400000).toISOString().split("T")[0];
    const days = dateRange(start, end).slice(0, 7);

    return {
      available: true,
      label: {
        dataType: "live",
        source: "MockWeatherProvider (sandbox)",
        retrievedAt,
      },
      location: input.location,
      forecast: days.map((date) => ({
        date,
        minTemp: Math.round(Math.random() * 10 + 18),
        maxTemp: Math.round(Math.random() * 10 + 26),
        unit: "C" as const,
        condition: CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)],
        precipitationChance: Math.round(Math.random() * 60),
        humidity: Math.round(Math.random() * 30 + 50),
        icon: "01d",
      })),
    };
  }
}
