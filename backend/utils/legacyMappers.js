/**
 * Maps AI provider offers to the legacy MongoDB catalogue shape used by /flights and /hotels UI.
 */

const PLACEHOLDER_HOTEL_IMAGES = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600",
  "https://images.unsplash.com/photo-1618773928121-c64742a6992b?w=600",
];

function formatTime(iso) {
  if (!iso) return "00:00";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDuration(minutes) {
  const h = Math.floor((minutes || 0) / 60);
  const m = (minutes || 0) % 60;
  return `${String(h).padStart(2, "0")} h ${String(m).padStart(2, "0")} m`;
}

function cityFromCode(code, fallback) {
  const map = {
    MAA: "Chennai", DEL: "New Delhi", BLR: "Bengaluru", BOM: "Mumbai",
    HYD: "Hyderabad", CCU: "Kolkata", ICN: "Seoul", SEL: "Seoul",
    TYO: "Tokyo", NRT: "Tokyo",
  };
  return map[code] || fallback || code;
}

function mapFlightOffer(offer, searchMeta = {}) {
  return {
    _id: offer.id,
    liveOffer: true,
    name: offer.airline,
    departure_time: formatTime(offer.departureAt),
    arrival_time: formatTime(offer.arrivalAt),
    duration: formatDuration(offer.durationMinutes),
    fare: offer.price?.amount ?? 0,
    stops: offer.stops === 0 ? "Non stop" : `${offer.stops} stop(s)`,
    departure: searchMeta.originLabel || cityFromCode(offer.origin, offer.origin),
    arrival: searchMeta.destinationLabel || cityFromCode(offer.destination, offer.destination),
    flight_details: {
      baggage: "15 Kgs (1 piece only)",
      checkin: "Web check-in available",
      cabin: offer.cabinClass || "ECONOMY",
    },
    label: offer.label,
    offerSnapshot: offer,
    flightNumber: offer.flightNumber,
    origin: offer.origin,
    destination: offer.destination,
    price: offer.price,
  };
}

function mapHotelOffer(offer, searchMeta = {}) {
  const city = searchMeta.cityLabel || searchMeta.cityCode || "Destination";
  return {
    _id: offer.id,
    liveOffer: true,
    name: offer.name,
    location: city,
    country: searchMeta.country || "International",
    price: offer.pricePerNight?.amount ?? offer.totalPrice?.amount ?? 0,
    ratings: offer.rating ?? offer.stars ?? 4,
    stars: offer.stars,
    cover: PLACEHOLDER_HOTEL_IMAGES[0],
    extraimageUrl: PLACEHOLDER_HOTEL_IMAGES,
    address: offer.address,
    label: offer.label,
    offerSnapshot: offer,
    totalPrice: offer.totalPrice,
    pricePerNight: offer.pricePerNight,
    checkIn: searchMeta.checkIn,
    checkOut: searchMeta.checkOut,
  };
}

function catalogueLabel() {
  return {
    dataType: "estimated",
    source: "SkyNora internal catalogue",
    retrievedAt: new Date().toISOString(),
  };
}

module.exports = {
  mapFlightOffer,
  mapHotelOffer,
  catalogueLabel,
  formatTime,
  formatDuration,
};
