const mongoose = require("mongoose");

const FlightSeatInventorySchema = new mongoose.Schema(
  {
    flight: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "flight",
      required: true,
    },
    travelDate: { type: String, required: true },
    seatNumber: { type: String, required: true },
    status: {
      type: String,
      enum: ["AVAILABLE", "HELD", "BOOKED"],
      required: true,
      default: "AVAILABLE",
    },
    heldBy: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    holdExpiresAt: { type: Date },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "allBookedFlights" },
  },
  { versionKey: false, timestamps: true }
);

FlightSeatInventorySchema.index(
  { flight: 1, travelDate: 1, seatNumber: 1 },
  { unique: true }
);

module.exports = mongoose.model("FlightSeatInventory", FlightSeatInventorySchema);
