const express = require("express");
const axios = require("axios");
const Flight = require("../../schema/flightSchema/flightSchema");
const FlightSeatInventory = require("../../models/FlightSeatInventory");
const router = express.Router();

const AIRPORT_CODE = /^[A-Z]{3}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const CABIN_CLASSES = new Set(["economy", "premium_economy", "business", "first"]);

/**
 * Searches live airline offers through Duffel. The access token remains on the
 * server, so it is never exposed to the browser.
 */
router.post("/offers", async (req, res) => {
  const { origin, destination, departureDate, returnDate, adults = 1, cabinClass = "economy" } = req.body;
  const normalizedOrigin = typeof origin === "string" ? origin.trim().toUpperCase() : "";
  const normalizedDestination = typeof destination === "string" ? destination.trim().toUpperCase() : "";
  const normalizedCabinClass = typeof cabinClass === "string" ? cabinClass.trim().toLowerCase() : "";
  const passengerCount = Number(adults);

  if (
    !AIRPORT_CODE.test(normalizedOrigin) ||
    !AIRPORT_CODE.test(normalizedDestination) ||
    normalizedOrigin === normalizedDestination ||
    !DATE.test(departureDate) ||
    (returnDate && !DATE.test(returnDate)) ||
    !Number.isInteger(passengerCount) ||
    passengerCount < 1 ||
    passengerCount > 9 ||
    !CABIN_CLASSES.has(normalizedCabinClass)
  ) {
    return res.status(400).json({
      success: false,
      message: "Provide different 3-letter airport codes, valid YYYY-MM-DD dates, 1-9 adults, and a supported cabin class.",
    });
  }

  if (!process.env.DUFFEL_ACCESS_TOKEN) {
    return res.status(503).json({
      success: false,
      message: "Flight search is not configured. Set DUFFEL_ACCESS_TOKEN on the server.",
    });
  }

  const slices = [{ origin: normalizedOrigin, destination: normalizedDestination, departure_date: departureDate }];
  if (returnDate) slices.push({ origin: normalizedDestination, destination: normalizedOrigin, departure_date: returnDate });

  try {
    const response = await axios.post(
      "https://api.duffel.com/air/offer_requests",
      {
        data: {
          slices,
          passengers: Array.from({ length: passengerCount }, () => ({ type: "adult" })),
          cabin_class: normalizedCabinClass,
        },
      },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.DUFFEL_ACCESS_TOKEN}`,
          "Duffel-Version": "v2",
        },
        timeout: 20000,
      }
    );

    res.status(200).json({ success: true, data: response.data.data });
  } catch (error) {
    const status = error.response?.status || 502;
    const message = error.response?.data?.errors?.[0]?.message || error.response?.data?.message || "Unable to retrieve flight offers from Duffel.";
    res.status(status).json({ success: false, message });
  }
});

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
