const express = require("express");
const prisma = require("../prisma");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

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

      const reviews = await prisma.review.findMany({
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
          booking: {
            include: {
              instrument: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.json({
        success: true,
        data: reviews,
      });
    } catch (error) {
      console.error("Failed to fetch reviews:", error);

      res.status(500).json({
        success: false,
        message: "Failed to fetch reviews",
      });
    }
  }
);

router.post(
  "/",
  requireAuth,
  requireRole("STUDENT", "PARENT"),
  async (req, res) => {
    try {
      const { bookingId, rating, comment } = req.body;

      const numericRating = Number(rating);

      if (!bookingId || !Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
        return res.status(400).json({
          success: false,
          message: "Booking and a rating from 1 to 5 are required.",
        });
      }

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

      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found.",
        });
      }

      if (booking.studentId !== studentProfile.id) {
        return res.status(403).json({
          success: false,
          message: "You can only review your own booking.",
        });
      }

      const completedLesson = await prisma.lesson.findFirst({
        where: {
          bookingId,
          status: "COMPLETED",
        },
      });

      if (!completedLesson) {
        return res.status(400).json({
          success: false,
          message: "You can review a coach after completing a lesson.",
        });
      }

      const existingReview = await prisma.review.findFirst({
        where: {
          bookingId,
        },
      });

      if (existingReview) {
        return res.status(400).json({
          success: false,
          message: "You have already reviewed this booking.",
        });
      }

      const review = await prisma.review.create({
        data: {
          bookingId,
          studentId: studentProfile.id,
          coachId: booking.coachId,
          rating: numericRating,
          comment: comment?.trim() || null,
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
          booking: {
            include: {
              instrument: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        data: review,
      });
    } catch (error) {
      console.error("Failed to create review:", error);

      res.status(500).json({
        success: false,
        message: "Failed to create review",
      });
    }
  }
);

module.exports = router;
