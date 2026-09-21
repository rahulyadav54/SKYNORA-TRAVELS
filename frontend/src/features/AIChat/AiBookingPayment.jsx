import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./AIChat.module.css";
import { clearAiBooking } from "./aiBookingSlice";
import { API_BASE_URL } from "../../config/api";
import { getValue } from "../../Utils/LocalStorage";

export const AiBookingPayment = () => {
  const { price } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { selectedFlight, selectedHotel, tripContext } = useSelector((s) => s.aiBooking);
  const [upi, setUpi] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const confirmBooking = async () => {
    setLoading(true);
    setError("");
    const token = getValue("userToken");
    const headers = {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };

    try {
      const bookings = [];
      if (selectedFlight) {
        const res = await fetch(`${API_BASE_URL}/bookings/ai/confirm`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            type: "flight",
            offer: selectedFlight,
            price: selectedFlight.price?.amount,
            currency: selectedFlight.price?.currency || "INR",
            sessionId: tripContext?.sessionId,
            dataLabel: selectedFlight.label,
            tripSummary: tripContext,
          }),
        });
        const json = await res.json();
        if (json.success) bookings.push(json.data.booking);
        else throw new Error(json.message);
      }
      if (selectedHotel) {
        const res = await fetch(`${API_BASE_URL}/bookings/ai/confirm`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            type: "hotel",
            offer: selectedHotel,
            price: selectedHotel.totalPrice?.amount || selectedHotel.pricePerNight?.amount,
            currency: selectedHotel.totalPrice?.currency || "INR",
            sessionId: tripContext?.sessionId,
            dataLabel: selectedHotel.label,
            tripSummary: tripContext,
          }),
        });
        const json = await res.json();
        if (json.success) bookings.push(json.data.booking);
        else throw new Error(json.message);
      }

      dispatch(clearAiBooking());
      navigate("/mytrips", { state: { aiBooked: true, count: bookings.length } });
    } catch (err) {
      setError(err.message || "Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePay = () => {
    if (process.env.REACT_APP_ENABLE_PAYMENTS !== "true") {
      setError("Payments disabled. Set REACT_APP_ENABLE_PAYMENTS=true in frontend .env.local");
      return;
    }
    if (upi.trim() !== "shreevali@ybl") {
      setError("Invalid UPI ID. Use demo UPI: shreevali@ybl");
      return;
    }
    confirmBooking();
  };

  return (
    <div className={styles.bookingReviewPage}>
      <div className={styles.bookingReviewCard}>
        <h2>Complete Payment</h2>
        <p className={styles.bookingSubtitle}>Amount: INR {Number(price).toLocaleString()}</p>

        <label className={styles.paymentLabel}>
          UPI ID (demo: shreevali@ybl)
          <input
            className={styles.paymentInput}
            value={upi}
            onChange={(e) => setUpi(e.target.value)}
            placeholder="yourname@upi"
          />
        </label>

        {error && <p className={styles.paymentError}>{error}</p>}

        <div className={styles.bookingActions}>
          <button type="button" className={styles.secondaryBtn} onClick={() => navigate("/ai-travel/book")}>
            Back
          </button>
          <button type="button" className={styles.primaryBtn} onClick={handlePay} disabled={loading}>
            {loading ? "Processing..." : "Pay & Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
};
