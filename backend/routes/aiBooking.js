/**
 * AI Agent → Booking bridge
 * Saves AI-recommended flights/hotels as confirmed bookings without requiring MongoDB catalogue IDs.
 */

const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const authMiddleware = require("../middleware/authMiddleware");
const AiBooking = require("../models/AiBooking");

const send = (res, code, message, data = null) => {
  res.status(code).json({ success: code < 400, message, data, status: code });
};

router.get("/", authMiddleware, async (req, res) => {
  try {
    const bookings = await AiBooking.find({ user: req.user.id }).sort({ createdAt: -1 });
    send(res, 200, "AI bookings fetched", { bookings });
  } catch {
    send(res, 500, "Internal Server Error");
  }
});

router.post(
  "/confirm",
  authMiddleware,
  [
    body("type").isIn(["flight", "hotel", "package"]),
    body("offer").notEmpty(),
    body("price").isNumeric(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return send(res, 400, errors.array()[0].msg);

    try {
      const { type, offer, price, currency = "INR", sessionId, dataLabel, tripSummary } = req.body;

      const booking = await AiBooking.create({
        user: req.user.id,
        type,
        offerSnapshot: offer,
        price: Number(price),
        currency,
        sessionId,
        dataLabel,
        tripSummary,
        status: "confirmed",
        source: "ai_agent",
      });

      send(res, 201, "AI booking confirmed", { booking });
    } catch (err) {
      console.error("[AI Booking]", err);
      send(res, 500, "Failed to save booking");
    }
  }
);

router.delete("/:bookingId", authMiddleware, async (req, res) => {
  try {
    const doc = await AiBooking.findOneAndUpdate(
      { _id: req.params.bookingId, user: req.user.id },
      { status: "cancelled" },
      { new: true }
    );
    if (!doc) return send(res, 404, "Booking not found");
    send(res, 200, "Booking cancelled", { booking: doc });
  } catch {
    send(res, 500, "Internal Server Error");
  }
});

module.exports = router;
