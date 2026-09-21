const mongoose = require("mongoose");

const AiBookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
    type: { type: String, enum: ["flight", "hotel", "package"], required: true },
    sessionId: { type: String },
    offerSnapshot: { type: mongoose.Schema.Types.Mixed, required: true },
    price: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: { type: String, enum: ["confirmed", "cancelled"], default: "confirmed" },
    source: { type: String, default: "ai_agent" },
    dataLabel: {
      dataType: { type: String, enum: ["live", "estimated", "ai_recommended"] },
      source: String,
      retrievedAt: String,
    },
    tripSummary: { type: mongoose.Schema.Types.Mixed },
  },
  { versionKey: false, timestamps: true }
);

module.exports = mongoose.model("aiBooking", AiBookingSchema);
