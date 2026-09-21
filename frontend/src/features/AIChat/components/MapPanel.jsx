import React from "react";
import styles from "../AIChat.module.css";
import MapIcon from "@mui/icons-material/Map";

export const MapPanel = ({ tripPlan, userLocation }) => {
  const pins = tripPlan?.mapPins || [];
  const allPins = userLocation && !pins.some((p) => p.type === "user")
    ? [{ id: "user", name: "You", type: "user", latitude: userLocation.lat, longitude: userLocation.lng }, ...pins]
    : pins;

  if (!allPins.length) {
    return (
      <p className={styles.emptyPanelText}>
        No map locations yet. Search hotels, restaurants, or attractions to see them here.
      </p>
    );
  }

  const lats = allPins.map((p) => p.latitude);
  const lngs = allPins.map((p) => p.longitude);
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  const pad = 0.02;
  const bbox = `${Math.min(...lngs) - pad},${Math.min(...lats) - pad},${Math.max(...lngs) + pad},${Math.max(...lats) + pad}`;
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${centerLat},${centerLng}`;

  const pinColor = (type) => {
    if (type === "hotel") return "#38bdf8";
    if (type === "restaurant") return "#f97316";
    if (type === "user") return "#22c55e";
    return "#a78bfa";
  };

  return (
    <div className={styles.mapPanel}>
      <iframe
        title="Trip map"
        className={styles.mapFrame}
        src={embedUrl}
        loading="lazy"
      />
      <div className={styles.mapPinList}>
        {allPins.map((pin) => (
          <a
            key={pin.id}
            className={styles.mapPinItem}
            href={`https://www.openstreetmap.org/?mlat=${pin.latitude}&mlon=${pin.longitude}#map=16/${pin.latitude}/${pin.longitude}`}
            target="_blank"
            rel="noreferrer"
          >
            <MapIcon fontSize="small" style={{ color: pinColor(pin.type) }} />
            <div>
              <div className={styles.mapPinName}>{pin.name}</div>
              <div className={styles.mapPinType}>{pin.type}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};
