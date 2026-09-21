const express = require("express");
const Hotels = require("../models/hotels.model");
const { searchHotelsLive, defaultHotelDates, catalogueLabel } = require("../utils/liveSearch");
const router = express.Router();

/**
 * Live hotel search via AI stack (Amadeus or Mock). Falls back to MongoDB catalogue.
 */
router.post("/search", async (req, res) => {
  const defaults = defaultHotelDates();
  const {
    city,
    cityCode,
    checkIn = defaults.checkIn,
    checkOut = defaults.checkOut,
    adults,
    rooms,
    maxResults,
    sortBy,
  } = req.body;

  try {
    const live = await searchHotelsLive({
      city,
      cityCode,
      checkIn,
      checkOut,
      adults,
      rooms,
      maxResults,
      sortBy,
    });

    if (live.ok && live.data.length) {
      return res.status(200).json({
        success: true,
        data: live.data,
        label: live.label,
        source: live.source,
        provider: live.provider,
        nights: live.nights,
      });
    }

    const hotels = await Hotels.find();
    const label = catalogueLabel();
    return res.status(200).json({
      success: true,
      data: hotels.map((hotel) => ({ ...hotel.toObject(), label })),
      label,
      source: "catalogue_fallback",
      warning: live.reason || "Live search returned no results — showing catalogue hotels.",
    });
  } catch (e) {
    try {
      const hotels = await Hotels.find();
      const label = catalogueLabel();
      return res.status(200).json({
        success: true,
        data: hotels.map((hotel) => ({ ...hotel.toObject(), label })),
        label,
        source: "catalogue_fallback",
        warning: e.message,
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
});

router.get("/", async (req, res) => {
  try {
    const hotels = await Hotels.find();
    res.status(200).json({
      success: true,
      data: hotels.map((hotel) => ({ ...hotel.toObject(), label: catalogueLabel() })),
      label: catalogueLabel(),
      source: "catalogue",
      warning: "Catalogue results are not live availability. POST /hotels/search for provider-backed results.",
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const hotel = await Hotels.findById(req.params.id);
    if (!hotel) {
      return res.status(404).json({ success: false, message: "Hotel not found" });
    }
    res.status(200).json({
      success: true,
      data: { ...hotel.toObject(), label: catalogueLabel() },
      label: catalogueLabel(),
      source: "catalogue",
      warning: "Catalogue results are not live availability. POST /hotels/search for provider-backed results.",
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
