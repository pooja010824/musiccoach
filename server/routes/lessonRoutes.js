const express = require("express");
const prisma = require("../prisma");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

const lessonInclude = {
  booking: {
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
  },
  progressNotes: true,
};

router.get(
  "/",
  requireAuth,
  requireRole("STUDENT", "PARENT", "COACH", "ADMIN"),
  async (req, res) => {
    try {
      const where =
        req.user.role === "ADMIN"
          ? {}
          : req.user.role === "COACH"
            ? { booking: { coach: { userId: req.user.userId } } }
            : { booking: { student: { userId: req.user.userId } } };

      const lessons = await prisma.lesson.findMany({
        where,
        include: lessonInclude,
        orderBy: {
          date: "asc",
        },
      });

      res.json({
        success: true,
        data: lessons,
      });
    } catch (error) {
      console.error("Failed to fetch lessons:", error);

      res.status(500).json({
        success: false,
        message: "Failed to fetch lessons",
      });
    }
  }
);

router.post(
  "/",
  requireAuth,
  requireRole("COACH", "ADMIN"),
  async (req, res) => {
    try {
      const { bookingId, date, notes, homework } = req.body;

      if (!bookingId || !date) {
        return res.status(400).json({
          success: false,
          message: "Booking ID and lesson date are required.",
        });
      }

      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found.",
        });
      }

      if (req.user.role === "COACH") {
        const coach = await prisma.coachProfile.findUnique({
          where: { userId: req.user.userId },
        });

        if (!coach || booking.coachId !== coach.id) {
          return res.status(403).json({
            success: false,
            message: "You can only manage lessons for your own students.",
          });
        }
      }

      const parsedDate = new Date(date);

      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid lesson date.",
        });
      }

      const lesson = await prisma.lesson.create({
        data: {
          bookingId,
          date: parsedDate,
          notes: notes || null,
          homework: homework || null,
          status: "SCHEDULED",
        },
        include: lessonInclude,
      });

      res.status(201).json({
        success: true,
        data: lesson,
      });
    } catch (error) {
      console.error("Failed to create lesson:", error);

      res.status(500).json({
        success: false,
        message: "Failed to create lesson",
      });
    }
  }
);

router.patch(
  "/:id/status",
  requireAuth,
  requireRole("COACH", "ADMIN"),
  async (req, res) => {
    try {
      const { status } = req.body;
      const allowedStatuses = [
        "SCHEDULED",
        "COMPLETED",
        "CANCELLED",
        "MISSED",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid lesson status.",
        });
      }

      const lesson = await prisma.lesson.findUnique({
        where: { id: req.params.id },
        include: { booking: true },
      });

      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: "Lesson not found.",
        });
      }

      if (req.user.role === "COACH") {
        const coach = await prisma.coachProfile.findUnique({
          where: { userId: req.user.userId },
        });

        if (!coach || lesson.booking.coachId !== coach.id) {
          return res.status(403).json({
            success: false,
            message: "You can only update your own lessons.",
          });
        }
      }

      const updatedLesson = await prisma.lesson.update({
        where: { id: req.params.id },
        data: { status },
        include: lessonInclude,
      });

      res.json({
        success: true,
        data: updatedLesson,
      });
    } catch (error) {
      console.error("Failed to update lesson status:", error);

      res.status(500).json({
        success: false,
        message: "Failed to update lesson status",
      });
    }
  }
);

module.exports = router;
