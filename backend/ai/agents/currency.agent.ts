/**
 * Currency Agent
 */

import { ProviderRegistry } from "../providers/interfaces";
import { CurrencyAgentResult } from "../types/results";
import { CurrencyInputSchema } from "../types/tools";

export class CurrencyAgent {
  constructor(private providers: ProviderRegistry) {}

  async getRate(rawInput: unknown): Promise<CurrencyAgentResult> {
    const input = CurrencyInputSchema.parse(rawInput);
    return this.providers.currency.getRate(input);
  }
}
