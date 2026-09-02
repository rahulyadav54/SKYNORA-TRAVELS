const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, select: false },
    phone: { type: String, required: true },
    mobile_number: { type: String },
    refreshTokens: [{ type: String }],
    preferences: {
      preferredCurrency: { type: String, default: "INR", uppercase: true, trim: true },
      dietaryRestrictions: { type: [String], default: [] },
      seatPreference: { type: String, enum: ["window", "aisle", "middle"] },
      hotelAmenities: { type: [String], default: [] },
      transportPreferences: { type: [String], default: [] },
      interests: { type: [String], default: [] },
      updatedAt: { type: Date },
    },
    savedItineraries: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
  },
  { versionKey: false, timestamps: true }
);

UserSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.refreshTokens;
  return user;
};

const User = mongoose.model("user", UserSchema);
module.exports = User;
