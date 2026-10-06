const express = require("express");
const prisma = require("../prisma");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

// GET MY BOOKINGS
router.get(
  "/",
  requireAuth,
  requireRole("STUDENT", "PARENT", "ADMIN"),
  async (req, res) => {
    try {
      const where =
        req.user.role === "ADMIN"
          ? {}
          : {
              student: {
                userId: req.user.userId,
              },
            };

      const bookings = await prisma.booking.findMany({
        where,
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
      console.error("Failed to fetch bookings:", error);

      res.status(500).json({
        success: false,
        message: "Failed to fetch bookings",
      });
    }
  }
);

// CREATE BOOKING
router.post(
  "/",
  requireAuth,
  requireRole("STUDENT", "PARENT"),
  async (req, res) => {
    try {
      const {
        coachId,
        instrumentId,
        dayOfWeek,
        startTime,
        durationMins,
        startDate,
      } = req.body;

      const studentProfile = await prisma.studentProfile.findUnique({
        where: {
          userId: req.user.userId,
        },
      });

      if (!studentProfile) {
        return res.status(403).json({
          success: false,
          message: "Student profile not found.",
        });
      }

      if (!coachId || !instrumentId || !startDate) {
        return res.status(400).json({
          success: false,
          message: "Coach, instrument and start date are required.",
        });
      }

      // Validate lesson time
      if (
        typeof startTime !== "string" ||
        !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(startTime)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid lesson start time.",
        });
      }

      const duration = Number(durationMins || 60);

      if (![30, 45, 60, 90, 120].includes(duration)) {
        return res.status(400).json({
          success: false,
          message: "Invalid lesson duration.",
        });
      }

      // Normalize the requested calendar date.
      // The frontend may send either YYYY-MM-DD or an ISO datetime.
      const dateOnly = String(startDate).slice(0, 10);

      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
        return res.status(400).json({
          success: false,
          message: "Invalid start date.",
        });
      }

      const parsedDate = new Date(`${dateOnly}T00:00:00`);

      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid start date.",
        });
      }

      // Prevent past bookings.
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (parsedDate < today) {
        return res.status(400).json({
          success: false,
          message: "Past dates cannot be booked.",
        });
      }

      // Store the calendar date consistently as UTC midnight.
      const dayStart = new Date(`${dateOnly}T00:00:00.000Z`);
      const dayEnd = new Date(`${dateOnly}T00:00:00.000Z`);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

      // Check coach exists.
      const coach = await prisma.coachProfile.findUnique({
        where: {
          id: coachId,
        },
      });

      if (!coach) {
        return res.status(404).json({
          success: false,
          message: "Coach not found.",
        });
      }

      // Check instrument exists.
      const instrument = await prisma.instrument.findUnique({
        where: {
          id: instrumentId,
        },
      });

      if (!instrument) {
        return res.status(404).json({
          success: false,
          message: "Instrument not found.",
        });
      }

      // Check coach teaches this instrument.
      const coachInstrument =
        await prisma.coachInstrument.findUnique({
          where: {
            coachId_instrumentId: {
              coachId,
              instrumentId,
            },
          },
        });

      if (!coachInstrument) {
        return res.status(400).json({
          success: false,
          message: "This coach does not teach the selected instrument.",
        });
      }

      // Prevent the same student from creating
      // another active booking at the same coach/date/time.
      const existingStudentBooking =
        await prisma.booking.findFirst({
          where: {
            studentId: studentProfile.id,
            coachId,
            instrumentId,
            startDate: {
              gte: dayStart,
              lt: dayEnd,
            },
            startTime,
            status: {
              not: "CANCELLED",
            },
          },
        });

      if (existingStudentBooking) {
        return res.status(409).json({
          success: false,
          message:
            "You already have an active booking for this coach at this date and time.",
        });
      }

      // Prevent the coach from being booked by another student
      // at the same date/time.
      const existingCoachBooking =
        await prisma.booking.findFirst({
          where: {
            coachId,
            startDate: {
              gte: dayStart,
              lt: dayEnd,
            },
            startTime,
            status: {
              not: "CANCELLED",
            },
          },
        });

      if (existingCoachBooking) {
        return res.status(409).json({
          success: false,
          message:
            "This coach is already booked for the selected date and time.",
        });
      }

      const booking = await prisma.booking.create({
        data: {
          studentId: studentProfile.id,
          coachId,
          instrumentId,
          dayOfWeek: Number(dayOfWeek),
          startTime,
          durationMins: duration,
          startDate: dayStart,
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
      console.error("Failed to create booking:", error);

      res.status(500).json({
        success: false,
        message: "Failed to create booking",
      });
    }
  }
);

// CANCEL BOOKING
router.patch(
  "/:id/cancel",
  requireAuth,
  requireRole("STUDENT", "PARENT", "ADMIN"),
  async (req, res) => {
    try {
      const booking = await prisma.booking.findUnique({
        where: {
          id: req.params.id,
        },
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found.",
        });
      }

      if (booking.status === "CANCELLED") {
        return res.status(400).json({
          success: false,
          message: "This booking is already cancelled.",
        });
      }

      if (booking.status === "COMPLETED") {
        return res.status(400).json({
          success: false,
          message: "Completed bookings cannot be cancelled.",
        });
      }

      // Admin can cancel any booking.
      if (req.user.role !== "ADMIN") {
        const studentProfile =
          await prisma.studentProfile.findUnique({
            where: {
              userId: req.user.userId,
            },
          });

        if (!studentProfile || booking.studentId !== studentProfile.id) {
          return res.status(403).json({
            success: false,
            message: "You can only cancel your own booking.",
          });
        }
      }

      const updatedBooking = await prisma.booking.update({
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
        data: updatedBooking,
      });
    } catch (error) {
      console.error("Failed to cancel booking:", error);

      res.status(500).json({
        success: false,
        message: "Failed to cancel booking",
      });
    }
  }
);

module.exports = router;
