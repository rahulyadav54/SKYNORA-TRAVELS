/**
 * Budget Agent — uses Calculation Engine (no LLM math).
 */

import { ProviderRegistry } from "../providers/interfaces";
import { BudgetAgentResult } from "../types/results";
import { Money } from "../types/trip";
import { buildBudgetSummary, checkBudgetOverruns } from "../engine/calculator";

export interface BudgetInput {
  totalBudget: Money;
  flightsCost: Money;
  hotelsCost: Money;
  foodCost: Money;
  transportCost: Money;
  activitiesCost: Money;
  miscCost: Money;
  totalDays: number;
  adults: number;
}

export class BudgetAgent {
  constructor(private _providers: ProviderRegistry) {}

  calculate(input: BudgetInput): BudgetAgentResult {
    const label = {
      dataType: "estimated" as const,
      source: "Calculation Engine",
      retrievedAt: new Date().toISOString(),
    };

    try {
      const summary = buildBudgetSummary({ ...input, label });
      const warnings = checkBudgetOverruns([
        { category: "Flights", amount: input.flightsCost, budget: { amount: input.totalBudget.amount * 0.4, currency: input.totalBudget.currency } },
        { category: "Hotels", amount: input.hotelsCost, budget: { amount: input.totalBudget.amount * 0.3, currency: input.totalBudget.currency } },
      ]);

      return {
        available: true,
        label,
        totalBudget: summary.totalBudget,
        breakdown: summary.breakdown,
        totalEstimated: summary.totalSpent,
        remaining: summary.remaining,
        perPersonPerDay: summary.perPersonPerDay,
        warnings,
      };
    } catch (err: unknown) {
      return {
        available: false,
        reason: err instanceof Error ? err.message : "Budget calculation failed",
        provider: "CalculationEngine",
        attemptedAt: new Date().toISOString(),
      };
    }
  }
}
