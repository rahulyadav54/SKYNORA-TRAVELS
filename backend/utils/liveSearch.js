/**
 * Live search bridge — reuses AI FlightAgent/HotelAgent for legacy REST endpoints.
 */

const { mapFlightOffer, mapHotelOffer, catalogueLabel } = require("./legacyMappers");

function loadAiModules() {
  try {
    const registry = require("../dist/ai/providers/registry");
    const { FlightAgent } = require("../dist/ai/agents/flight.agent");
    const { HotelAgent } = require("../dist/ai/agents/hotel.agent");
    const location = require("../dist/ai/engine/location");
    return {
      getProviderRegistry: registry.getProviderRegistry,
      FlightAgent,
      HotelAgent,
      resolveAirportCode: location.resolveAirportCode,
      resolveCityCode: location.resolveCityCode,
    };
  } catch (err) {
    console.warn("[liveSearch] AI modules not built:", err.message);
    return null;
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function searchFlightsLive(params) {
  const ai = loadAiModules();
  if (!ai) {
    return { ok: false, reason: "AI search module not available. Run npm run build:ai" };
  }

  const {
    origin,
    destination,
    departureDate,
    returnDate,
    adults = 1,
    cabinClass = "ECONOMY",
    maxResults = 10,
    sortBy = "cheapest",
  } = params;

  if (!origin || !destination || !DATE_RE.test(departureDate)) {
    return { ok: false, reason: "origin, destination, and departureDate (YYYY-MM-DD) are required" };
  }

  const registry = ai.getProviderRegistry();
  const agent = new ai.FlightAgent(registry);
  const originCode = await ai.resolveAirportCode(String(origin));
  const destCode = await ai.resolveAirportCode(String(destination));

  const result = await agent.search({
    origin: originCode,
    destination: destCode,
    departureDate,
    returnDate: returnDate && DATE_RE.test(returnDate) ? returnDate : undefined,
    adults: Number(adults) || 1,
    cabinClass: String(cabinClass).toUpperCase(),
    maxResults: Math.min(Number(maxResults) || 10, 15),
    sortBy,
  });

  if (!result.available) {
    return { ok: false, reason: result.reason || "Flight search unavailable" };
  }

  const data = result.flights.map((f) =>
    mapFlightOffer(f, { originLabel: origin, destinationLabel: destination })
  );

  return {
    ok: true,
    data,
    label: result.label,
    source: /randomapi|mockdata/i.test(result.label?.source || "")
      ? "external"
      : /mock/i.test(result.label?.source || "")
        ? "mock"
        : "live",
    provider: result.label?.source,
  };
}

async function searchHotelsLive(params) {
  const ai = loadAiModules();
  if (!ai) {
    return { ok: false, reason: "AI search module not available. Run npm run build:ai" };
  }

  const {
    city,
    cityCode,
    checkIn,
    checkOut,
    adults = 1,
    rooms = 1,
    maxResults = 10,
    sortBy = "cheapest",
  } = params;

  const locationInput = cityCode || city;
  if (!locationInput || !DATE_RE.test(checkIn) || !DATE_RE.test(checkOut)) {
    return { ok: false, reason: "city/cityCode, checkIn, and checkOut (YYYY-MM-DD) are required" };
  }

  const registry = ai.getProviderRegistry();
  const agent = new ai.HotelAgent(registry);
  const code = await ai.resolveCityCode(String(locationInput));

  const result = await agent.search({
    cityCode: code,
    checkIn,
    checkOut,
    adults: Number(adults) || 1,
    rooms: Number(rooms) || 1,
    maxResults: Math.min(Number(maxResults) || 10, 15),
    sortBy,
  });

  if (!result.available) {
    return { ok: false, reason: result.reason || "Hotel search unavailable" };
  }

  const data = result.hotels.map((h) =>
    mapHotelOffer(h, {
      cityCode: code,
      cityLabel: city || code,
      checkIn,
      checkOut,
    })
  );

  return {
    ok: true,
    data,
    label: result.label,
    source: /randomapi|mockdata/i.test(result.label?.source || "")
      ? "external"
      : /mock/i.test(result.label?.source || "")
        ? "mock"
        : "live",
    provider: result.label?.source,
    nights: result.nights,
  };
}

function defaultHotelDates() {
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 7);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 2);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { checkIn: fmt(checkIn), checkOut: fmt(checkOut) };
}

module.exports = {
  searchFlightsLive,
  searchHotelsLive,
  defaultHotelDates,
  catalogueLabel,
};
