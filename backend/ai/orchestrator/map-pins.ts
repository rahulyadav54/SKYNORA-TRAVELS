import { TripPlan, MapPin } from "../types/trip";
import { ConversationSession } from "../types/session";
import { isDataUnavailable } from "../types/results";

export function extractMapPins(session: ConversationSession, tripPlan?: TripPlan): MapPin[] {
  const pins: MapPin[] = [];
  const seen = new Set<string>();

  const add = (pin: MapPin) => {
    const key = `${pin.latitude},${pin.longitude}`;
    if (seen.has(key)) return;
    seen.add(key);
    pins.push(pin);
  };

  if (session.constraints.userLocation) {
    add({
      id: "user-loc",
      name: "Your location",
      type: "user",
      latitude: session.constraints.userLocation.lat,
      longitude: session.constraints.userLocation.lng,
    });
  }

  for (const hotel of tripPlan?.hotels ?? []) {
    if (hotel.latitude != null && hotel.longitude != null) {
      add({
        id: hotel.id,
        name: hotel.name,
        type: "hotel",
        latitude: hotel.latitude,
        longitude: hotel.longitude,
        address: hotel.address,
      });
    }
  }

  for (const call of session.toolCallLog) {
    if (isDataUnavailable(call.output)) continue;
    const out = call.output as Record<string, unknown>;

    for (const list of [out.attractions, out.restaurants, out.hotels]) {
      if (!Array.isArray(list)) continue;
      for (const item of list) {
        const p = item as { id?: string; name?: string; latitude?: number; longitude?: number; address?: string };
        if (p.latitude == null || p.longitude == null) continue;
        add({
          id: p.id || `pin-${pins.length}`,
          name: p.name || "Place",
          type: call.toolName.includes("restaurant") ? "restaurant" : call.toolName.includes("hotel") ? "hotel" : "attraction",
          latitude: p.latitude,
          longitude: p.longitude,
          address: p.address,
        });
      }
    }
  }

  return pins;
}
