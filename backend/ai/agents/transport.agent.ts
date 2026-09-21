/**
 * Transport Agent — directions and multi-mode comparison.
 */

import { ProviderRegistry } from "../providers/interfaces";
import { TransportAgentResult } from "../types/results";
import { TransportInputSchema } from "../types/tools";

const COMPARE_MODES = ["transit", "driving", "walking", "bicycling"] as const;

export interface TransportCompareResult {
  available: true;
  label: { dataType: "live" | "estimated"; source: string; retrievedAt: string };
  from: string;
  to: string;
  comparisons: Array<{
    mode: string;
    available: boolean;
    durationMinutes?: number;
    distanceKm?: number;
    cost?: { amount: number; currency: string };
    summary?: string;
    reason?: string;
  }>;
  recommendation?: string;
}

export class TransportAgent {
  constructor(private providers: ProviderRegistry) {}

  async getDirections(rawInput: unknown): Promise<TransportAgentResult> {
    const input = TransportInputSchema.parse(rawInput);
    return this.providers.places.getDirections(input);
  }

  async compareModes(rawInput: unknown): Promise<TransportCompareResult | { available: false; reason: string; attemptedAt: string }> {
    const input = TransportInputSchema.parse(rawInput);
    const retrievedAt = new Date().toISOString();
    const comparisons: TransportCompareResult["comparisons"] = [];

    for (const mode of COMPARE_MODES) {
      try {
        const result = await this.providers.places.getDirections({ ...input, mode });
        if (result.available && result.options?.length) {
          const best = result.options[0];
          comparisons.push({
            mode,
            available: true,
            durationMinutes: best.durationMinutes,
            distanceKm: best.distanceKm,
            cost: best.cost,
            summary: best.steps?.slice(0, 2).join(" → ") || `${mode} route`,
          });
        } else {
          comparisons.push({ mode, available: false, reason: (result as { reason?: string }).reason || "No route" });
        }
      } catch (err) {
        comparisons.push({
          mode,
          available: false,
          reason: err instanceof Error ? err.message : "Failed",
        });
      }
    }

    const viable = comparisons.filter((c) => c.available);
    if (!viable.length) {
      return { available: false, reason: "No transport routes found between these locations", attemptedAt: retrievedAt };
    }

    const cheapest = viable.reduce((a, b) =>
      ((a.cost?.amount ?? Infinity) < (b.cost?.amount ?? Infinity) ? a : b));
    const fastest = viable.reduce((a, b) =>
      ((a.durationMinutes ?? Infinity) < (b.durationMinutes ?? Infinity) ? a : b));

    return {
      available: true,
      label: {
        dataType: this.providers.places.name.toLowerCase().includes("mock") ? "estimated" : "live",
        source: this.providers.places.name,
        retrievedAt,
      },
      from: input.from,
      to: input.to,
      comparisons,
      recommendation: `Fastest: ${fastest.mode} (~${fastest.durationMinutes} min). Most economical: ${cheapest.mode}.`,
    };
  }
}
