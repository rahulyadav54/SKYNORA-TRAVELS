/**
 * AviationStack flight status adapter — live gate/delay data when API key is configured.
 * Free tier: https://aviationstack.com/
 */

import axios from "axios";
import { FlightStatusInput, FlightStatusResult } from "../../agents/flight-status.agent";

const BASE_URL = "http://api.aviationstack.com/v1/flights";

function mapStatus(raw: string | undefined): FlightStatusResult["status"] {
  const s = (raw || "").toLowerCase();
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("landed") || s.includes("arrived")) return "landed";
  if (s.includes("departed") || s.includes("active") || s.includes("en-route")) return "departed";
  if (s.includes("delay")) return "delayed";
  if (s.includes("scheduled") || s.includes("on time")) return "on_time";
  return "unknown";
}

export async function fetchAviationStackStatus(
  input: FlightStatusInput
): Promise<FlightStatusResult | null> {
  const apiKey = process.env.AVIATIONSTACK_API_KEY;
  if (!apiKey) return null;

  try {
    const flightNumber = input.flightNumber.replace(/\s+/g, "").toUpperCase();
    const params: Record<string, string> = {
      access_key: apiKey,
      flight_iata: flightNumber,
      flight_date: input.date,
      limit: "1",
    };
    if (input.origin) params.dep_iata = input.origin.toUpperCase();
    if (input.destination) params.arr_iata = input.destination.toUpperCase();

    const { data } = await axios.get(BASE_URL, { params, timeout: 12000 });
    const row = data?.data?.[0];
    if (!row) return null;

    const dep = row.departure || {};
    const arr = row.arrival || {};
    const delayMin = dep.delay ?? arr.delay;
    const status = mapStatus(row.flight_status);
    const statusText =
      status === "delayed" && delayMin
        ? `Delayed ~${delayMin} min`
        : status === "on_time"
          ? "On time"
          : status === "cancelled"
            ? "Cancelled"
            : status === "departed"
              ? "Departed"
              : status === "landed"
                ? "Landed"
                : row.flight_status || "Unknown";

    return {
      available: true,
      label: {
        dataType: "live",
        source: "AviationStack API",
        retrievedAt: new Date().toISOString(),
      },
      flightNumber: row.flight?.iata || flightNumber,
      date: input.date,
      status,
      statusText,
      delayMinutes: delayMin ? Number(delayMin) : undefined,
      gate: dep.gate || arr.gate,
      terminal: dep.terminal || arr.terminal,
      scheduledDeparture: dep.scheduled,
      estimatedDeparture: dep.estimated || dep.actual,
      scheduledArrival: arr.scheduled,
      estimatedArrival: arr.estimated || arr.actual,
      origin: dep.iata || input.origin,
      destination: arr.iata || input.destination,
      note: "Live status from AviationStack.",
    };
  } catch (err) {
    console.warn("[AviationStack] flight status failed:", (err as Error).message);
    return null;
  }
}
