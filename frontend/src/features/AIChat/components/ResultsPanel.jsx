import React from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import styles from "../AIChat.module.css";
import FlightIcon from "@mui/icons-material/Flight";
import HotelIcon from "@mui/icons-material/Hotel";
import { selectAiFlight, selectAiHotel, setTripContext } from "../aiBookingSlice";

export const ResultsPanel = ({ tripPlan, sessionId, constraints }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const flights = tripPlan?.flights || [];
  const hotels = tripPlan?.hotels || [];

  const saveContext = () => {
    dispatch(setTripContext({
      sessionId,
      destination: constraints?.destination,
      departureDate: constraints?.departureDate,
      returnDate: constraints?.returnDate,
      budgetTotal: constraints?.budgetTotal,
    }));
  };

  const reserveFlight = (flight) => {
    saveContext();
    dispatch(selectAiFlight(flight));
    navigate("/ai-travel/book");
  };

  const reserveHotel = (hotel) => {
    saveContext();
    dispatch(selectAiHotel(hotel));
    navigate("/ai-travel/book");
  };

  if (!flights.length && !hotels.length) {
    return (
      <p className={styles.emptyPanelText}>
        No flight or hotel results yet. Ask SkyNora to search for your trip.
      </p>
    );
  }

  return (
    <div className={styles.resultsPanel}>
      {flights.length > 0 && (
        <section>
          <h4 className={styles.resultsSectionTitle}><FlightIcon fontSize="small" /> Flights</h4>
          {flights.slice(0, 5).map((f) => (
            <div key={f.id} className={styles.resultCard}>
              <div className={styles.resultTitle}>{f.airline} {f.flightNumber}</div>
              <div className={styles.resultMeta}>
                {f.origin} → {f.destination} · {f.stops === 0 ? "Direct" : `${f.stops} stop(s)`}
              </div>
              <div className={styles.resultPrice}>
                {f.price?.currency} {f.price?.amount?.toLocaleString()}
                <span className={styles.resultLabel}>{f.label?.dataType || "live"}</span>
              </div>
              <button type="button" className={styles.reserveBtn} onClick={() => reserveFlight(f)}>
                Reserve flight
              </button>
            </div>
          ))}
        </section>
      )}

      {hotels.length > 0 && (
        <section>
          <h4 className={styles.resultsSectionTitle}><HotelIcon fontSize="small" /> Hotels</h4>
          {hotels.slice(0, 5).map((h) => (
            <div key={h.id} className={styles.resultCard}>
              <div className={styles.resultTitle}>{h.name}</div>
              <div className={styles.resultMeta}>
                {"★".repeat(h.stars || 0)} {h.rating ? `· ${h.rating}/10` : ""}
              </div>
              <div className={styles.resultPrice}>
                {h.totalPrice?.currency || "INR"} {(h.totalPrice?.amount || h.pricePerNight?.amount)?.toLocaleString()} total
                <span className={styles.resultLabel}>{h.label?.dataType || "live"}</span>
              </div>
              <button type="button" className={styles.reserveBtn} onClick={() => reserveHotel(h)}>
                Reserve hotel
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};
