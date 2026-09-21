import React from "react";
import styles from "../AIChat.module.css";
import EventNoteIcon from "@mui/icons-material/EventNote";

export const ItineraryPanel = ({ tripPlan }) => {
  const days = tripPlan?.itinerary || [];

  if (!days.length) {
    return <p className={styles.emptyPanelText}>No itinerary yet. Ask SkyNora to build a day-by-day plan.</p>;
  }

  return (
    <div className={styles.itineraryList}>
      {days.map((day, idx) => (
        <div key={idx} className={styles.itineraryDayCard}>
          <div className={styles.itineraryDayHeader}>
            <EventNoteIcon fontSize="small" />
            <span>Day {day.dayNumber || idx + 1} — {day.date}</span>
          </div>
          {day.theme && <div className={styles.itineraryTheme}>{day.theme}</div>}
          {day.activities?.map((act, i) => (
            <div key={i} className={styles.itineraryItem}>
              <span className={styles.itineraryTime}>{act.time || "—"}</span>
              <span>{act.name || act.description}</span>
            </div>
          ))}
          {day.meals?.map((meal, i) => (
            <div key={`meal-${i}`} className={styles.itineraryItem}>
              <span className={styles.itineraryTime}>{meal.time || "—"}</span>
              <span>🍽 {meal.restaurantName || meal.name} ({meal.cuisine})</span>
            </div>
          ))}
          {day.estimatedCost && (
            <div className={styles.itineraryCost}>
              Day est.: {day.estimatedCost.currency} {day.estimatedCost.amount}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
