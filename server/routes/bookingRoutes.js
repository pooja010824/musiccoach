const express = require("express");
const prisma = require("../prisma");

const router = express.Router();


// GET ALL BOOKINGS
router.get("/", async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        student: {
          include: {
            user: true,
          },
        },
        coach: {
          include: {
            user: true,
          },
        },
        instrument: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    console.error(
      "Failed to fetch bookings:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
    });
  }
});


// CREATE BOOKING
router.post("/", async (req, res) => {
  try {
    const {
      studentId,
      coachId,
      instrumentId,
      dayOfWeek,
      startTime,
      durationMins,
      startDate,
    } = req.body;

    const booking = await prisma.booking.create({
      data: {
        studentId,
        coachId,
        instrumentId,
        dayOfWeek,
        startTime,
        durationMins: durationMins || 60,
        startDate: new Date(startDate),
        status: "TRIAL",
      },
      include: {
        student: {
          include: {
            user: true,
          },
        },
        coach: {
          include: {
            user: true,
          },
        },
        instrument: true,
      },
    });

    res.status(201).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error(
      "Failed to create booking:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to create booking",
    });
  }
});


// CANCEL BOOKING
router.patch("/:id/cancel", async (req, res) => {
  try {
    const booking = await prisma.booking.update({
      where: {
        id: req.params.id,
      },
      data: {
        status: "CANCELLED",
      },
      include: {
        student: {
          include: {
            user: true,
          },
        },
        coach: {
          include: {
            user: true,
          },
        },
        instrument: true,
      },
    });

    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error(
      "Failed to cancel booking:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to cancel booking",
    });
  }
});


module.exports = router;

