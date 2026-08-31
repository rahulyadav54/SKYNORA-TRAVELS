require("dotenv").config();
const mongoose = require("mongoose");
const FlightSeatInventory = require("./models/FlightSeatInventory");

async function test() {
  await mongoose.connect(process.env.MONGOOSE_DB_URL);
  
  // Expire seat A1
  await FlightSeatInventory.updateOne(
    { flight: "6a955ba8852682526fc13574", travelDate: "2026-09-01", seatNumber: "A1" },
    { $set: { holdExpiresAt: new Date(Date.now() - 60000) } }
  );
  
  console.log("Seat A1 expired");
  await mongoose.disconnect();
}

test().catch((e) => console.error(e));
