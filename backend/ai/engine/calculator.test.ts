/**
 * Calculation Engine — Vitest Unit Tests
 */

import { describe, it, expect } from "vitest";
import {
  convertCurrency, sumMoney, addMoney, subtractMoney, multiplyMoney,
  calcFlightCost, calcHotelCost, calcNights, buildBudgetSummary,
  formatDuration, sumMinutes, checkBudgetOverruns, zeroCurrency,
} from "./calculator";
import { Money } from "../types/trip";

describe("convertCurrency", () => {
  it("converts INR to KRW", () => {
    const result = convertCurrency({ amount: 100000, currency: "INR" }, "KRW", 16.2);
    expect(result.amount).toBe(1620000);
    expect(result.currency).toBe("KRW");
  });

  it("returns same if already target currency", () => {
    const m: Money = { amount: 5000, currency: "INR" };
    expect(convertCurrency(m, "INR", 1)).toEqual(m);
  });
});

describe("sumMoney", () => {
  it("sums same-currency amounts", () => {
    const amounts: Money[] = [
      { amount: 10000, currency: "INR" },
      { amount: 5000, currency: "INR" },
      { amount: 3000, currency: "INR" },
    ];
    expect(sumMoney(amounts, "INR")).toEqual({ amount: 18000, currency: "INR" });
  });

  it("converts and sums mixed currencies", () => {
    const amounts: Money[] = [
      { amount: 100, currency: "USD" },
      { amount: 50000, currency: "INR" },
    ];
    const rates = { "USD:INR": 83.5 };
    const result = sumMoney(amounts, "INR", rates);
    expect(result.amount).toBeCloseTo(58350, 0);
    expect(result.currency).toBe("INR");
  });

  it("throws when rate is missing", () => {
    const amounts: Money[] = [
      { amount: 100, currency: "USD" },
      { amount: 50000, currency: "INR" },
    ];
    expect(() => sumMoney(amounts, "INR", {})).toThrow("No exchange rate");
  });
});

describe("addMoney", () => {
  it("adds two same-currency values", () => {
    expect(addMoney({ amount: 100, currency: "INR" }, { amount: 200, currency: "INR" })).toEqual({ amount: 300, currency: "INR" });
  });

  it("throws on currency mismatch", () => {
    expect(() => addMoney({ amount: 100, currency: "INR" }, { amount: 100, currency: "USD" })).toThrow("Currency mismatch");
  });
});

describe("subtractMoney", () => {
  it("calculates remaining budget", () => {
    const budget = { amount: 100000, currency: "INR" };
    const spent = { amount: 35000, currency: "INR" };
    expect(subtractMoney(budget, spent)).toEqual({ amount: 65000, currency: "INR" });
  });

  it("returns negative when over budget", () => {
    const result = subtractMoney({ amount: 1000, currency: "INR" }, { amount: 1500, currency: "INR" });
    expect(result.amount).toBe(-500);
  });
});

describe("multiplyMoney", () => {
  it("multiplies amount by factor", () => {
    expect(multiplyMoney({ amount: 5000, currency: "INR" }, 3)).toEqual({ amount: 15000, currency: "INR" });
  });

  it("rounds to 2 decimal places", () => {
    const result = multiplyMoney({ amount: 100, currency: "USD" }, 3.333);
    expect(result.amount).toBe(333.3);
  });
});

describe("calcFlightCost", () => {
  const mockFlight = (price: number, currency = "INR") => ({
    id: "F1", label: { dataType: "live" as const }, airline: "AI",
    flightNumber: "AI101", origin: "MAA", destination: "ICN",
    departureAt: "2025-01-01T06:00:00Z", arrivalAt: "2025-01-01T14:00:00Z",
    durationMinutes: 480, stops: 0, price: { amount: price, currency },
    cabinClass: "economy",
  });

  it("calculates total flight cost for 2 adults", () => {
    const result = calcFlightCost([mockFlight(20000)], 2);
    expect(result.amount).toBe(40000);
  });

  it("returns zero for empty flights array", () => {
    expect(calcFlightCost([], 2)).toEqual(zeroCurrency("INR"));
  });

  it("sums multiple flight legs", () => {
    // outbound + return
    const result = calcFlightCost([mockFlight(20000), mockFlight(18000)], 1);
    expect(result.amount).toBe(38000);
  });
});

describe("calcHotelCost", () => {
  const mockHotel = (price: number) => ({
    id: "H1", label: { dataType: "live" as const }, name: "Test Hotel",
    address: "Seoul", stars: 4, pricePerNight: { amount: price, currency: "INR" },
    checkIn: "2025-01-01", checkOut: "2025-01-07",
  });

  it("calculates cost for 7 nights 1 room", () => {
    expect(calcHotelCost(mockHotel(3000), 7, 1)).toEqual({ amount: 21000, currency: "INR" });
  });

  it("calculates cost for 5 nights 2 rooms", () => {
    expect(calcHotelCost(mockHotel(3000), 5, 2)).toEqual({ amount: 30000, currency: "INR" });
  });
});

describe("calcNights", () => {
  it("calculates 7 nights", () => {
    expect(calcNights("2025-01-01", "2025-01-08")).toBe(7);
  });

  it("returns at least 1 night", () => {
    expect(calcNights("2025-01-01", "2025-01-01")).toBe(1);
  });
});

describe("buildBudgetSummary", () => {
  const label = { dataType: "live" as const, source: "test", retrievedAt: new Date().toISOString() };
  const cur = "INR";

  it("calculates correct remaining and per-person-per-day", () => {
    const summary = buildBudgetSummary({
      label,
      totalBudget: { amount: 100000, currency: cur },
      flightsCost: { amount: 40000, currency: cur },
      hotelsCost: { amount: 25000, currency: cur },
      foodCost: { amount: 10000, currency: cur },
      transportCost: { amount: 5000, currency: cur },
      activitiesCost: { amount: 8000, currency: cur },
      miscCost: { amount: 2000, currency: cur },
      totalDays: 7,
      adults: 1,
    });
    expect(summary.totalSpent.amount).toBe(90000);
    expect(summary.remaining.amount).toBe(10000);
    expect(summary.perPersonPerDay.amount).toBeCloseTo(12857.14, 0);
  });
});

describe("formatDuration", () => {
  it("formats hours and minutes", () => expect(formatDuration(150)).toBe("2h 30m"));
  it("formats only hours", () => expect(formatDuration(120)).toBe("2h"));
  it("formats only minutes", () => expect(formatDuration(45)).toBe("45m"));
});

describe("sumMinutes", () => {
  it("sums durations", () => expect(sumMinutes([30, 60, 90])).toBe(180));
  it("handles empty array", () => expect(sumMinutes([])).toBe(0));
});

describe("checkBudgetOverruns", () => {
  it("flags critical overspend", () => {
    const warnings = checkBudgetOverruns([{
      category: "flights",
      amount: { amount: 80000, currency: "INR" },
      budget: { amount: 40000, currency: "INR" },
    }]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].severity).toBe("critical");
  });

  it("does not flag when under budget", () => {
    const warnings = checkBudgetOverruns([{
      category: "flights",
      amount: { amount: 30000, currency: "INR" },
      budget: { amount: 40000, currency: "INR" },
    }]);
    expect(warnings).toHaveLength(0);
  });
});
