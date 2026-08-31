const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { body, validationResult } = require("express-validator");
const AllBookedFlights = require("../models/AllBookedFlights");
const Flight = require("../schema/flightSchema/flightSchema");
const FlightSeatInventory = require("../models/FlightSeatInventory");
const authMiddleware = require("../middleware/authMiddleware");

const sendResponse = (res, statusCode, message, data = null) => {
  res.status(statusCode).json({ success: statusCode < 400, message, data, status: statusCode });
};

router.get("/flights", authMiddleware, async (req, res) => {
  try {
    const bookings = await AllBookedFlights.find({ user: req.user.id }).populate("flight");
    sendResponse(res, 200, "Bookings fetched successfully", { bookings });
  } catch (error) {
    sendResponse(res, 500, "Internal Server Error");
  }
});

router.get("/flights/:bookingId", authMiddleware, async (req, res) => {
  try {
    const booking = await AllBookedFlights.findOne({
      _id: req.params.bookingId,
      user: req.user.id,
    }).populate("flight");
    if (!booking) {
      return sendResponse(res, 404, "Booking not found");
    }
    sendResponse(res, 200, "Booking fetched successfully", { booking });
  } catch (error) {
    sendResponse(res, 500, "Internal Server Error");
  }
});

router.post(
  "/flights",
  authMiddleware,
  [
    body("name").notEmpty(),
    body("departure_time").notEmpty(),
    body("arrival_time").notEmpty(),
    body("fare").isNumeric(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(res, 400, errors.array()[0].msg);
    }
    try {
      const booking = await AllBookedFlights.create({
        ...req.body,
        user: req.user.id,
        flight: req.body.flightId || req.body._id || req.user.id,
      });
      sendResponse(res, 201, "Booking created successfully", { booking });
    } catch (error) {
      sendResponse(res, 500, "Internal Server Error");
    }
  }
);

router.post("/flight/hold-seat", authMiddleware, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { flightId, travelDate, seatNumber } = req.body;
    if (!flightId || !travelDate || !seatNumber) {
      await session.abortTransaction();
      session.endSession();
      return sendResponse(res, 400, "flightId, travelDate, and seatNumber are required");
    }

    const flight = await Flight.findById(flightId).session(session);
    if (!flight) {
      await session.abortTransaction();
      session.endSession();
      return sendResponse(res, 404, "Flight not found");
    }

    const holdExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    let seat = await FlightSeatInventory.findOne({ flight: flightId, travelDate, seatNumber }).session(session);

    if (!seat) {
      seat = await FlightSeatInventory.create(
        [
          {
            flight: flightId,
            travelDate,
            seatNumber,
            status: "HELD",
            heldBy: req.user.id,
            holdExpiresAt,
          },
        ],
        { session }
      );
      seat = seat[0];
    } else if (seat.status === "AVAILABLE") {
      seat = await FlightSeatInventory.findByIdAndUpdate(
        seat._id,
        { $set: { status: "HELD", heldBy: req.user.id, holdExpiresAt } },
        { new: true, session }
      );
    } else if (seat.status === "HELD") {
      if (seat.holdExpiresAt && new Date(seat.holdExpiresAt) > new Date()) {
        await session.abortTransaction();
        session.endSession();
        return sendResponse(res, 409, `Seat ${seatNumber} is currently held by another user`);
      }
      seat = await FlightSeatInventory.findByIdAndUpdate(
        seat._id,
        { $set: { status: "HELD", heldBy: req.user.id, holdExpiresAt } },
        { new: true, session }
      );
    } else if (seat.status === "BOOKED") {
      await session.abortTransaction();
      session.endSession();
      return sendResponse(res, 409, `Seat ${seatNumber} is already booked`);
    }

    await session.commitTransaction();
    session.endSession();

    sendResponse(res, 200, "Seat held successfully", { seat });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    sendResponse(res, 500, "Internal Server Error");
  }
});

router.post("/flight/confirm", authMiddleware, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { flightId, travelDate, seatNumber, fare } = req.body;
    if (!flightId || !travelDate || !seatNumber) {
      await session.abortTransaction();
      session.endSession();
      return sendResponse(res, 400, "flightId, travelDate, and seatNumber are required");
    }

    const flight = await Flight.findById(flightId).session(session);
    if (!flight) {
      await session.abortTransaction();
      session.endSession();
      return sendResponse(res, 404, "Flight not found");
    }

    const seat = await FlightSeatInventory.findOneAndUpdate(
      { flight: flightId, travelDate, seatNumber, status: "HELD", heldBy: req.user.id },
      {
        $set: {
          status: "BOOKED",
          holdExpiresAt: null,
        },
      },
      { new: true, session }
    );

    if (!seat) {
      await session.abortTransaction();
      session.endSession();
      return sendResponse(res, 409, "Seat is not held by you or has expired");
    }

    const booking = await AllBookedFlights.create(
      [
        {
          user: req.user.id,
          flight: flightId,
          name: flight.name,
          departure_time: flight.departure_time,
          arrival_time: flight.arrival_time,
          duration: flight.duration,
          fare: fare || flight.fare,
          stops: flight.stops,
          departure: flight.departure,
          arrival: flight.arrival,
          seatNumber,
          travelDate,
          bookingStatus: "CONFIRMED",
        },
      ],
      { session }
    );

    await FlightSeatInventory.findByIdAndUpdate(
      seat._id,
      { $set: { booking: booking[0]._id } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    sendResponse(res, 201, "Booking confirmed successfully", { booking: booking[0], seat });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    sendResponse(res, 500, "Internal Server Error");
  }
});

router.delete("/flights/:bookingId", authMiddleware, async (req, res) => {
  try {
    const booking = await AllBookedFlights.findOne({
      _id: req.params.bookingId,
      user: req.user.id,
    });

    if (!booking) {
      return sendResponse(res, 404, "Booking not found");
    }

    booking.bookingStatus = "CANCELLED";
    await booking.save();

    if (booking.seatNumber && booking.travelDate) {
      await FlightSeatInventory.updateOne(
        { flight: booking.flight, travelDate: booking.travelDate, seatNumber: booking.seatNumber, status: "BOOKED" },
        { $set: { status: "AVAILABLE", heldBy: null, holdExpiresAt: null, booking: null } }
      );
    }

    sendResponse(res, 200, "Booking cancelled successfully", { booking });
  } catch (error) {
    sendResponse(res, 500, "Internal Server Error");
  }
});

module.exports = router;
