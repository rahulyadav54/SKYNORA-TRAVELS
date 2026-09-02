/**
 * OpenWeatherMap Adapter
 */

import axios from "axios";
import NodeCache from "node-cache";
import { WeatherProvider } from "../interfaces";
import { WeatherAgentResult } from "../../types/results";
import { WeatherInput } from "../../types/tools";

const cache = new NodeCache({ stdTTL: 1800 }); // 30 min cache

export class OpenWeatherAdapter implements WeatherProvider {
  readonly name = "OpenWeatherMap";
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY!;
  }

  async getForecast(input: WeatherInput): Promise<WeatherAgentResult> {
    const cacheKey = `weather:${input.location}:${input.units}`;
    const cached = cache.get<WeatherAgentResult>(cacheKey);
    if (cached) return cached;

    const retrievedAt = new Date().toISOString();
    try {
      const res = await axios.get("https://api.openweathermap.org/data/2.5/forecast", {
        params: { q: input.location, appid: this.apiKey, units: input.units ?? "metric", cnt: 40 },
      });

      // Group 3-hour forecasts by day
      const byDay: Record<string, { min: number; max: number; conditions: string[]; humidity: number[]; pop: number[] }> = {};
      for (const item of res.data.list as Record<string, unknown>[]) {
        const date = (item.dt_txt as string).split(" ")[0];
        const main = item.main as Record<string, number>;
        const weather = (item.weather as Record<string, string>[])[0];
        if (!byDay[date]) byDay[date] = { min: Infinity, max: -Infinity, conditions: [], humidity: [], pop: [] };
        byDay[date].min = Math.min(byDay[date].min, main.temp_min);
        byDay[date].max = Math.max(byDay[date].max, main.temp_max);
        byDay[date].conditions.push(weather.description);
        byDay[date].humidity.push(main.humidity);
        byDay[date].pop.push((item.pop as number) * 100);
      }

      const unit = input.units === "imperial" ? "F" : "C";
      const forecast = Object.entries(byDay).slice(0, 7).map(([date, d]) => ({
        date,
        minTemp: Math.round(d.min),
        maxTemp: Math.round(d.max),
        unit: unit as "C" | "F",
        condition: d.conditions[Math.floor(d.conditions.length / 2)],
        precipitationChance: Math.round(Math.max(...d.pop)),
        humidity: Math.round(d.humidity.reduce((a, b) => a + b, 0) / d.humidity.length),
        icon: "01d",
      }));

      const result: WeatherAgentResult = {
        available: true,
        label: { dataType: "live", source: "OpenWeatherMap API", retrievedAt },
        location: input.location,
        forecast,
      };
      cache.set(cacheKey, result);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { available: false, reason: `OpenWeatherMap error: ${message}`, provider: "OpenWeatherMap", attemptedAt: retrievedAt };
    }
  }
}
