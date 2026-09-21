import React, { useCallback, useEffect, useState } from "react";
import styles from "../AIChat.module.css";
import FlightIcon from "@mui/icons-material/Flight";
import WbCloudyIcon from "@mui/icons-material/WbCloudy";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import RefreshIcon from "@mui/icons-material/Refresh";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import { API_BASE_URL } from "../../../config/api";

const severityClass = {
  info: styles.alertInfo,
  warning: styles.alertWarning,
  critical: styles.alertCritical,
};

export const DuringTripPanel = ({
  sessionId,
  tripPlan,
  constraints,
  userLocation,
  authHeaders,
  onQuickAction,
  onRequestLocation,
}) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStatus = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/ai/trip-status?sessionId=${sessionId}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) setStatus(data.data);
      else setError(data.message || "Could not load trip status");
    } catch {
      setError("Failed to connect to trip status API");
    } finally {
      setLoading(false);
    }
  }, [sessionId, authHeaders]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const loc = userLocation || constraints?.userLocation;
  const flights = status?.flights?.length ? status.flights : tripPlan?.flights || [];

  if (!sessionId && !tripPlan) {
    return (
      <p className={styles.emptyPanelText}>
        Start a trip plan first, then use this panel for live assistance during your journey.
      </p>
    );
  }

  return (
    <div className={styles.duringTripPanel}>
      <div className={styles.duringTripHeader}>
        <h4>During-trip assistant</h4>
        <button type="button" className={styles.refreshBtn} onClick={fetchStatus} disabled={loading || !sessionId}>
          <RefreshIcon fontSize="small" /> {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className={styles.duringTripLocation}>
        <MyLocationIcon fontSize="small" />
        {loc ? (
          <span>📍 {loc.label || `${loc.lat}, ${loc.lng}`}</span>
        ) : (
          <button type="button" className={styles.linkBtn} onClick={onRequestLocation}>
            Share location for nearby help
          </button>
        )}
      </div>

      {error && <p className={styles.duringTripError}>{error}</p>}

      {status?.alerts?.length > 0 && (
        <div className={styles.alertList}>
          {status.alerts.map((alert, i) => (
            <div key={i} className={`${styles.alertCard} ${severityClass[alert.severity] || styles.alertInfo}`}>
              <WarningAmberIcon fontSize="small" />
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {status?.weatherToday && (
        <div className={styles.weatherCard}>
          <WbCloudyIcon fontSize="small" />
          <div>
            <strong>{constraints?.destination || "Destination"} today</strong>
            <div>{status.weatherToday.condition} · {status.weatherToday.maxTemp}°{status.weatherToday.unit}</div>
            <div className={styles.weatherMeta}>Rain chance: {status.weatherToday.precipitationChance}%</div>
          </div>
        </div>
      )}

      {flights.length > 0 && (
        <div className={styles.flightStatusList}>
          <h5><FlightIcon fontSize="small" /> Flight status</h5>
          {flights.map((f, i) => {
            const fs = f.status;
            const delayed = fs?.status === "delayed";
            const cancelled = fs?.status === "cancelled";
            return (
              <div key={i} className={styles.flightStatusCard}>
                <div className={styles.flightStatusTop}>
                  <span>{f.airline} {f.flightNumber}</span>
                  <span className={delayed ? styles.statusDelayed : cancelled ? styles.statusCancelled : styles.statusOk}>
                    {fs?.statusText || "Check in chat"}
                  </span>
                </div>
                <div className={styles.flightStatusMeta}>
                  {f.origin} → {f.destination}
                  {fs?.gate && ` · Gate ${fs.gate}`}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.quickActionList}>
        <h5>Quick actions</h5>
        <button type="button" onClick={() => onQuickAction("What can I do near me in the next 2 hours?")}>
          Near me (2h)
        </button>
        {flights[0] && (
          <button
            type="button"
            onClick={() => onQuickAction(
              `Check flight status for ${flights[0].flightNumber} on ${flights[0].departureAt?.slice(0, 10) || "today"}`
            )}
          >
            Check my flight
          </button>
        )}
        <button
          type="button"
          onClick={() => onQuickAction(
            `It's raining at ${constraints?.destination || "my destination"} — adapt my itinerary for indoor activities`
          )}
        >
          Rain backup plan
        </button>
        <button
          type="button"
          onClick={() => onQuickAction("Compare transport from my current location to the nearest attraction on my itinerary")}
        >
          Transport from here
        </button>
      </div>

      {status?.retrievedAt && (
        <p className={styles.statusTimestamp}>
          Last updated: {new Date(status.retrievedAt).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
};
