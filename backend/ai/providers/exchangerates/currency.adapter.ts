/**
 * ExchangeRates.host Currency Adapter
 */

import axios from "axios";
import NodeCache from "node-cache";
import { CurrencyProvider } from "../interfaces";
import { CurrencyAgentResult } from "../../types/results";
import { CurrencyInput } from "../../types/tools";

const cache = new NodeCache({ stdTTL: 3600 }); // 60-min cache

export class ExchangeRatesAdapter implements CurrencyProvider {
  readonly name = "ExchangeRates.host";
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.EXCHANGE_RATES_API_KEY!;
  }

  async getRate(input: CurrencyInput): Promise<CurrencyAgentResult> {
    const cacheKey = `fx:${input.fromCurrency}:${input.toCurrency}`;
    const cached = cache.get<CurrencyAgentResult>(cacheKey);
    if (cached) {
      // Return cached result but flag it
      if ((cached as { available: true }).available) {
        const hit = cached as unknown as { available: true; label: Record<string, unknown> };
        return { ...cached, label: { ...hit.label, dataType: "estimated" } } as CurrencyAgentResult;
      }
      return cached;
    }

    const retrievedAt = new Date().toISOString();
    const today = new Date().toISOString().split("T")[0];

    try {
      const res = await axios.get("https://api.exchangerate.host/latest", {
        params: {
          access_key: this.apiKey,
          base: input.fromCurrency,
          symbols: input.toCurrency,
        },
      });

      if (!res.data.success) {
        return { available: false, reason: "ExchangeRates.host returned failure", provider: "ExchangeRates.host", attemptedAt: retrievedAt };
      }

      const rate = res.data.rates[input.toCurrency];
      if (!rate) {
        return { available: false, reason: `No rate found for ${input.toCurrency}`, provider: "ExchangeRates.host", attemptedAt: retrievedAt };
      }

      const result: CurrencyAgentResult = {
        available: true,
        label: { dataType: "live", source: "ExchangeRates.host API", retrievedAt },
        fromCurrency: input.fromCurrency,
        toCurrency: input.toCurrency,
        rate,
        convertedAmount: input.amount != null ? parseFloat((input.amount * rate).toFixed(2)) : undefined,
        rateDate: today,
      };
      cache.set(cacheKey, result);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { available: false, reason: `ExchangeRates error: ${message}`, provider: "ExchangeRates.host", attemptedAt: retrievedAt };
    }
  }
}
