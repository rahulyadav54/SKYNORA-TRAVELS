import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import styles from "./AIChat.module.css";
import { clearAiBooking } from "./aiBookingSlice";
import { getValue } from "../../Utils/LocalStorage";
import FlightIcon from "@mui/icons-material/Flight";
import HotelIcon from "@mui/icons-material/Hotel";
import ShoppingCartCheckoutIcon from "@mui/icons-material/ShoppingCartCheckout";

export const AiBookingReview = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { selectedFlight, selectedHotel, tripContext } = useSelector((s) => s.aiBooking);
  const isLoggedIn = useSelector((s) => s.auth.isUserLoggedIn);

  const flightPrice = selectedFlight?.price?.amount || 0;
  const hotelPrice = selectedHotel?.totalPrice?.amount || selectedHotel?.pricePerNight?.amount || 0;
  const total = flightPrice + hotelPrice;
  const currency = selectedFlight?.price?.currency || selectedHotel?.totalPrice?.currency || "INR";

  if (!selectedFlight && !selectedHotel) {
    return (
      <div className={styles.bookingReviewPage}>
        <div className={styles.bookingReviewCard}>
          <h2>No items selected</h2>
          <p className={styles.emptyPanelText}>
            Go back to the AI Agent, search flights or hotels, and tap <strong>Reserve</strong> on a result.
          </p>
          <button type="button" className={styles.primaryBtn} onClick={() => navigate("/ai-travel")}>
            Back to AI Agent
          </button>
        </div>
      </div>
    );
  }

  const handleProceed = () => {
    if (!isLoggedIn && !getValue("userToken")) {
      navigate("/");
      return;
    }
    navigate(`/ai-travel/book/payment/${total}`);
  };

  return (
    <div className={styles.bookingReviewPage}>
      <div className={styles.bookingReviewCard}>
        <h2><ShoppingCartCheckoutIcon /> Review AI Trip Booking</h2>
        {tripContext?.destination && (
          <p className={styles.bookingSubtitle}>Trip to {tripContext.destination}</p>
        )}

        {selectedFlight && (
          <div className={styles.bookingItem}>
            <h4><FlightIcon fontSize="small" /> Flight</h4>
            <div className={styles.bookingItemTitle}>
              {selectedFlight.airline} {selectedFlight.flightNumber}
            </div>
            <div className={styles.bookingItemMeta}>
              {selectedFlight.origin} → {selectedFlight.destination}
              · {selectedFlight.stops === 0 ? "Direct" : `${selectedFlight.stops} stop(s)`}
            </div>
            <div className={styles.bookingItemPrice}>
              {selectedFlight.price?.currency} {selectedFlight.price?.amount?.toLocaleString()}
              <span className={styles.resultLabel}>{selectedFlight.label?.dataType || "sourced"}</span>
            </div>
          </div>
        )}

        {selectedHotel && (
          <div className={styles.bookingItem}>
            <h4><HotelIcon fontSize="small" /> Hotel</h4>
            <div className={styles.bookingItemTitle}>{selectedHotel.name}</div>
            <div className={styles.bookingItemMeta}>{selectedHotel.address}</div>
            <div className={styles.bookingItemPrice}>
              {selectedHotel.totalPrice?.currency || "INR"}{" "}
              {(selectedHotel.totalPrice?.amount || selectedHotel.pricePerNight?.amount)?.toLocaleString()}
              <span className={styles.resultLabel}>{selectedHotel.label?.dataType || "sourced"}</span>
            </div>
          </div>
        )}

        <div className={styles.bookingTotal}>
          <span>Total</span>
          <strong>{currency} {total.toLocaleString()}</strong>
        </div>

        <p className={styles.bookingDisclaimer}>
          This reserves your AI-recommended selection. Prices are from the data source shown above at booking time.
        </p>

        <div className={styles.bookingActions}>
          <button type="button" className={styles.secondaryBtn} onClick={() => navigate("/ai-travel")}>
            Back
          </button>
          <button type="button" className={styles.primaryBtn} onClick={handleProceed}>
            Proceed to Payment
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => {
              dispatch(clearAiBooking());
              navigate("/ai-travel");
            }}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
};
