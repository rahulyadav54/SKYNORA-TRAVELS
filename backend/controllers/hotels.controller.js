const express = require("express");
const Hotels = require("../models/hotels.model");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const hotels = await Hotels.find();
    res.status(200).json({ success: true, data: hotels });
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
    res.status(200).json({ success: true, data: hotel });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
