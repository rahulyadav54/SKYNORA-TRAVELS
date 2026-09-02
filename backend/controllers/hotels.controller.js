const express = require("express");
const Hotels = require("../models/hotels.model");
const router = express.Router();

// Legacy catalogue endpoints are retained for the existing UI. They are not
// availability/price feeds, so clients receive an explicit provenance label.
const catalogueLabel = () => ({
  dataType: "estimated",
  source: "SkyNora internal hotel catalogue",
  retrievedAt: new Date().toISOString(),
});

router.get("/", async (req, res) => {
  try {
    const hotels = await Hotels.find();
    res.status(200).json({
      success: true,
      data: hotels.map((hotel) => ({ ...hotel.toObject(), label: catalogueLabel() })),
      label: catalogueLabel(),
      warning: "Catalogue results are not live availability. Use /ai/chat for provider-backed searches.",
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
      warning: "Catalogue results are not live availability. Use /ai/chat for provider-backed searches.",
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
