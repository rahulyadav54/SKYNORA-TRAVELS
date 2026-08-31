const express = require("express");
const Flight = require("../../schema/flightSchema/flightSchema");
const FlightSeatInventory = require("../../models/FlightSeatInventory");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const flights = await Flight.find();
    res.status(200).json({ success: true, data: flights });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const flight = await Flight.findById(req.params.id);
    if (!flight) {
      return res.status(404).json({ success: false, message: "Flight not found" });
    }
    res.status(200).json({ success: true, data: flight });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get("/:flightId/seats", async (req, res) => {
  try {
    const { flightId } = req.params;
    const { travelDate } = req.query;

    if (!travelDate) {
      return res.status(400).json({ success: false, message: "travelDate query parameter is required" });
    }

    const flight = await Flight.findById(flightId);
    if (!flight) {
      return res.status(404).json({ success: false, message: "Flight not found" });
    }

    const seats = await FlightSeatInventory.find({
      flight: flightId,
      travelDate,
    }).sort({ seatNumber: 1 });

    res.status(200).json({ success: true, data: seats });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const flight = await Flight.create(req.body);
    res.status(201).json({ success: true, data: flight });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
