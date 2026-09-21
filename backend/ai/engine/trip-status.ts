/**
 * During-trip status snapshot — aggregates flight status, weather alerts, and location.
 */

import { ConversationSession } from "../types/session";
import { ProviderRegistry } from "../providers/interfaces";
import { FlightStatusAgent, FlightStatusResult } from "../agents/flight-status.agent";
import { FlightOption } from "../types/trip";
import { WeatherDay } from "../types/results";

export interface TripAlert {
  severity: "info" | "warning" | "critical";
  type: "weather" | "flight" | "location";
  message: string;
  source?: string;
}

export interface TripStatusSnapshot {
  available: true;
  retrievedAt: string;
  userLocation?: { lat: number; lng: number; label?: string };
  destination?: string;
  flights: Array<FlightOption & { status?: FlightStatusResult }>;
  weatherToday?: WeatherDay;
  alerts: TripAlert[];
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isBadWeather(day: WeatherDay): boolean {
  const rain = day.precipitationChance >= 60;
  const storm = /storm|thunder|heavy rain|snow/i.test(day.condition);
  const extremeHeat = day.maxTemp >= 38 && day.unit === "C";
  return rain || storm || extremeHeat;
}

export async function buildTripStatus(
  session: ConversationSession,
  providers: ProviderRegistry
): Promise<TripStatusSnapshot> {
  const flightAgent = new FlightStatusAgent();
  const retrievedAt = new Date().toISOString();
  const alerts: TripAlert[] = [];
  const today = todayIso();

  const loc = session.constraints.userLocation;
  if (loc) {
    alerts.push({
      severity: "info",
      type: "location",
      message: `Location shared: ${loc.label || `${loc.lat}, ${loc.lng}`}`,
    });
  } else {
    alerts.push({
      severity: "info",
      type: "location",
      message: "Share your location for nearby recommendations and transport guidance.",
    });
  }

  const flights = session.tripPlan?.flights || [];
  const flightsWithStatus: Array<FlightOption & { status?: FlightStatusResult }> = [];

  for (const flight of flights.slice(0, 3)) {
    const depDate = flight.departureAt?.slice(0, 10) || today;
    const status = await flightAgent.check({
      flightNumber: flight.flightNumber,
      date: depDate,
      origin: flight.origin,
      destination: flight.destination,
    });
    flightsWithStatus.push({ ...flight, status });

    if (status.status === "delayed") {
      alerts.push({
        severity: "warning",
        type: "flight",
        message: `${flight.flightNumber} delayed${status.delayMinutes ? ` ~${status.delayMinutes} min` : ""}`,
        source: status.label.source,
      });
    }
    if (status.status === "cancelled") {
      alerts.push({
        severity: "critical",
        type: "flight",
        message: `${flight.flightNumber} appears cancelled — consider rebooking`,
        source: status.label.source,
      });
    }
  }

  let weatherToday: WeatherDay | undefined;
  const destination = session.constraints.destination;
  if (destination) {
    try {
      const forecast = await providers.weather.getForecast({
        location: destination,
        startDate: today,
        endDate: today,
        units: "metric",
      });
      if (forecast.available) {
        weatherToday = forecast.forecast.find((d) => d.date === today) || forecast.forecast[0];
        if (weatherToday && isBadWeather(weatherToday)) {
          alerts.push({
            severity: "warning",
            type: "weather",
            message: `${destination}: ${weatherToday.condition} (${weatherToday.precipitationChance}% rain, ${weatherToday.maxTemp}°${weatherToday.unit}) — consider adapting outdoor plans`,
            source: forecast.label.source,
          });
        }
      }
    } catch {
      // weather optional
    }
  }

  return {
    available: true,
    retrievedAt,
    userLocation: loc,
    destination,
    flights: flightsWithStatus,
    weatherToday,
    alerts,
  };
}
