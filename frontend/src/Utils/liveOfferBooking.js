/**
 * Converts legacy live-search results to AI booking cart format.
 */

export function flightOfferFromLegacy(item) {
  const snap = item.offerSnapshot;
  if (snap) return snap;
  return {
    id: item._id,
    label: item.label,
    airline: item.name,
    flightNumber: item.flightNumber || item.name,
    origin: item.origin || item.departure,
    destination: item.destination || item.arrival,
    departureAt: item.departureAt,
    arrivalAt: item.arrivalAt,
    durationMinutes: item.durationMinutes,
    stops: item.stops === "Non stop" ? 0 : 1,
    price: item.price || { amount: item.fare, currency: "INR" },
    cabinClass: item.flight_details?.cabin || "ECONOMY",
  };
}

export function hotelOfferFromLegacy(item) {
  const snap = item.offerSnapshot;
  if (snap) return snap;
  return {
    id: item._id,
    label: item.label,
    name: item.name,
    address: item.address || item.location,
    stars: item.stars || Math.round(item.ratings),
    rating: item.ratings,
    pricePerNight: item.pricePerNight || { amount: item.price, currency: "INR" },
    totalPrice: item.totalPrice || { amount: item.price, currency: "INR" },
    checkIn: item.checkIn,
    checkOut: item.checkOut,
  };
}
