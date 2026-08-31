const mongoose = require("mongoose");

const AllBookedFlightsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    flight: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "flight",
      required: true,
    },
    name: { type: String, required: true },
    departure_time: { type: String, required: true },
    arrival_time: { type: String, required: true },
    duration: { type: String, required: false },
    fare: { type: Number, required: true },
    stops: { type: String, required: false },
    departure: { type: String, required: false },
    arrival: { type: String, required: false },
    seatNumber: { type: String, required: false },
    travelDate: { type: String, required: false },
    bookingStatus: {
      type: String,
      enum: ["HELD", "CONFIRMED", "CANCELLED"],
      default: "CONFIRMED",
    },
  },
  { versionKey: false, timestamps: true }
);

const AllBookedFlights = mongoose.model("allBookedFlights", AllBookedFlightsSchema);
module.exports = AllBookedFlights;
