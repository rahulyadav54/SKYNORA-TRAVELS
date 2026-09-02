/**
 * Calculation Engine — purely deterministic, zero LLM involvement.
 * All cost totals, currency conversions, and distance/time math go through here.
 * Every function is pure and fully testable.
 */

import { Money, BudgetSummary, FlightOption, HotelOption, DayPlan } from "../types/trip";
import { DataLabel } from "../types/trip";

// ── Currency Conversion ───────────────────────────────────────────────────────

/**
 * Converts an amount from one currency to another using a known exchange rate.
 * NEVER calls an LLM — rate must come from CurrencyProvider.
 */
export function convertCurrency(amount: Money, targetCurrency: string, rate: number): Money {
  if (amount.currency === targetCurrency) return amount;
  return {
    amount: parseFloat((amount.amount * rate).toFixed(2)),
    currency: targetCurrency,
  };
}

/**
 * Converts multiple Money values to the same target currency and sums them.
 * Each amount must already be in the same currency OR rates must be provided.
 */
export function sumMoney(amounts: Money[], targetCurrency: string, rates: Record<string, number> = {}): Money {
  const total = amounts.reduce((acc, m) => {
    if (m.currency === targetCurrency) return acc + m.amount;
    const rate = rates[`${m.currency}:${targetCurrency}`] ?? rates[m.currency];
    if (!rate) throw new Error(`No exchange rate provided for ${m.currency} → ${targetCurrency}`);
    return acc + m.amount * rate;
  }, 0);

  return { amount: parseFloat(total.toFixed(2)), currency: targetCurrency };
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}. Convert first.`);
  }
  return { amount: parseFloat((a.amount + b.amount).toFixed(2)), currency: a.currency };
}

export function subtractMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}. Convert first.`);
  }
  return { amount: parseFloat((a.amount - b.amount).toFixed(2)), currency: a.currency };
}

export function multiplyMoney(m: Money, factor: number): Money {
  return { amount: parseFloat((m.amount * factor).toFixed(2)), currency: m.currency };
}

export function zeroCurrency(currency: string): Money {
  return { amount: 0, currency };
}

// ── Trip Cost Calculations ────────────────────────────────────────────────────

/** Total flight cost for all passengers */
export function calcFlightCost(flights: FlightOption[], adults: number): Money {
  if (flights.length === 0) return zeroCurrency("INR");
  const baseCurrency = flights[0].price.currency;
  const perPersonTotal = flights.reduce((acc, f) => {
    if (f.price.currency !== baseCurrency) throw new Error("Mixed flight currencies — convert first");
    return acc + f.price.amount;
  }, 0);
  return { amount: parseFloat((perPersonTotal * adults).toFixed(2)), currency: baseCurrency };
}

/** Total hotel cost for a stay (nights × rooms × pricePerNight) */
export function calcHotelCost(hotel: HotelOption, nights: number, rooms: number = 1): Money {
  return { amount: parseFloat((hotel.pricePerNight.amount * nights * rooms).toFixed(2)), currency: hotel.pricePerNight.currency };
}

/** Number of nights between two ISO date strings */
export function calcNights(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  return Math.max(1, Math.round((b - a) / 86400000));
}

/** Day-by-day itinerary cost total */
export function calcItineraryCost(days: DayPlan[]): Money {
  if (days.length === 0) return zeroCurrency("INR");
  const currency = days[0].estimatedCost.currency;
  const total = days.reduce((acc, d) => {
    if (d.estimatedCost.currency !== currency) throw new Error("Mixed day-plan currencies");
    return acc + d.estimatedCost.amount;
  }, 0);
  return { amount: parseFloat(total.toFixed(2)), currency };
}

// ── Budget Summary ────────────────────────────────────────────────────────────

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
  label: DataLabel;
}

export function buildBudgetSummary(input: BudgetInput): BudgetSummary {
  const cur = input.totalBudget.currency;

  const breakdown = {
    flights: input.flightsCost,
    hotels: input.hotelsCost,
    food: input.foodCost,
    transport: input.transportCost,
    activities: input.activitiesCost,
    misc: input.miscCost,
  };

  // All must be in same currency — enforce at call site
  const totalSpentAmount = Object.values(breakdown).reduce((acc, m) => {
    if (m.currency !== cur) throw new Error(`Budget currency mismatch: expected ${cur}, got ${m.currency}`);
    return acc + m.amount;
  }, 0);

  const totalSpent: Money = { amount: parseFloat(totalSpentAmount.toFixed(2)), currency: cur };
  const remaining: Money = {
    amount: parseFloat((input.totalBudget.amount - totalSpentAmount).toFixed(2)),
    currency: cur,
  };
  const perPersonPerDay: Money = {
    amount: input.totalDays > 0 && input.adults > 0
      ? parseFloat((totalSpentAmount / (input.totalDays * input.adults)).toFixed(2))
      : 0,
    currency: cur,
  };

  return {
    label: input.label,
    totalBudget: input.totalBudget,
    breakdown,
    totalSpent,
    remaining,
    perPersonPerDay,
  };
}

// ── Distance & Time Aggregation ───────────────────────────────────────────────

/** Sum durations in minutes */
export function sumMinutes(durations: number[]): number {
  return durations.reduce((a, b) => a + b, 0);
}

/** Format minutes → human-readable "2h 30m" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Sum distances in km */
export function sumDistanceKm(distances: number[]): number {
  return parseFloat(distances.reduce((a, b) => a + b, 0).toFixed(2));
}

// ── Budget Warnings ───────────────────────────────────────────────────────────

export interface BudgetCheck {
  category: string;
  amount: Money;
  budget: Money;
}

export function checkBudgetOverruns(checks: BudgetCheck[]): Array<{ category: string; message: string; severity: "info" | "warning" | "critical" }> {
  return checks
    .filter((c) => c.amount.currency === c.budget.currency && c.amount.amount > c.budget.amount)
    .map((c) => {
      const over = ((c.amount.amount - c.budget.amount) / c.budget.amount) * 100;
      const severity = over > 50 ? "critical" : over > 20 ? "warning" : "info";
      return {
        category: c.category,
        message: `${c.category} cost (${c.amount.currency} ${c.amount.amount.toLocaleString()}) exceeds budget by ${over.toFixed(0)}%.`,
        severity,
      };
    });
}
