/**
 * Flight status agent — uses AviationStack when configured, otherwise mock demo data.
 */

import { fetchAviationStackStatus } from "../providers/aviationstack/flight-status.adapter";

export interface FlightStatusInput {
  flightNumber: string;
  date: string;
  origin?: string;
  destination?: string;
}

export interface FlightStatusResult {
  available: true;
  label: { dataType: "live" | "estimated"; source: string; retrievedAt: string };
  flightNumber: string;
  date: string;
  status: "on_time" | "delayed" | "cancelled" | "departed" | "landed" | "unknown";
  statusText: string;
  delayMinutes?: number;
  gate?: string;
  terminal?: string;
  scheduledDeparture?: string;
  estimatedDeparture?: string;
  scheduledArrival?: string;
  estimatedArrival?: string;
  origin?: string;
  destination?: string;
  note: string;
}

export class FlightStatusAgent {
  async check(input: FlightStatusInput): Promise<FlightStatusResult> {
    const live = await fetchAviationStackStatus(input);
    if (live) return live;
    return this.mockCheck(input);
  }

  mockCheck(input: FlightStatusInput): FlightStatusResult {
    const retrievedAt = new Date().toISOString();
    const hash = input.flightNumber.charCodeAt(0) + input.date.charCodeAt(8);
    const statuses: FlightStatusResult["status"][] = ["on_time", "on_time", "delayed", "on_time", "departed"];
    const status = statuses[hash % statuses.length];
    const delayMinutes = status === "delayed" ? 25 + (hash % 40) : undefined;

    const statusText =
      status === "on_time" ? "On time"
        : status === "delayed" ? `Delayed ~${delayMinutes} min`
          : status === "departed" ? "Departed"
            : status;

    return {
      available: true,
      label: {
        dataType: "estimated",
        source: "SkyNora flight status (mock — set AVIATIONSTACK_API_KEY for live data)",
        retrievedAt,
      },
      flightNumber: input.flightNumber.toUpperCase(),
      date: input.date,
      status,
      statusText,
      delayMinutes,
      gate: status !== "cancelled" ? `G${(hash % 20) + 1}` : undefined,
      origin: input.origin,
      destination: input.destination,
      note: "Simulated status for demo. Add AVIATIONSTACK_API_KEY to backend/.env for live flight data.",
    };
  }
}
