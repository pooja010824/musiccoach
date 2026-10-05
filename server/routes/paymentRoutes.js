const express = require("express");
const prisma = require("../prisma");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();


// GET MY PAYMENTS
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
              booking: {
                student: {
                  userId: req.user.userId,
                },
              },
            };

      const payments = await prisma.payment.findMany({
        where,
        include: {
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
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.json({
        success: true,
        data: payments,
      });
    } catch (error) {
      console.error("Failed to fetch payments:", error);

      res.status(500).json({
        success: false,
        message: "Failed to fetch payments",
      });
    }
  }
);


// CREATE PAYMENT
router.post(
  "/",
  requireAuth,
  requireRole("STUDENT", "PARENT"),
  async (req, res) => {
    try {
      const {
        bookingId,
        transactionId,
      } = req.body;

      if (!bookingId) {
        return res.status(400).json({
          success: false,
          message: "Booking ID is required.",
        });
      }

      const booking = await prisma.booking.findUnique({
        where: {
          id: bookingId,
        },
        include: {
          coach: true,
          student: true,
          instrument: true,
        },
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found.",
        });
      }

      // Find logged-in user's student profile
      const studentProfile =
        await prisma.studentProfile.findUnique({
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

      // User can only pay for their own booking
      if (booking.studentId !== studentProfile.id) {
        return res.status(403).json({
          success: false,
          message: "You can only make payments for your own booking.",
        });
      }

      if (booking.status === "CANCELLED") {
        return res.status(400).json({
          success: false,
          message: "Cannot create payment for a cancelled booking.",
        });
      }

      if (!booking.coach.hourlyRate) {
        return res.status(400).json({
          success: false,
          message: "Coach hourly rate is not configured.",
        });
      }

      // Calculate amount on the server
      const amount =
        Number(booking.coach.hourlyRate) *
        (Number(booking.durationMins || 60) / 60);

      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment amount.",
        });
      }

      // Prevent duplicate active payments
      const existingPayment =
        await prisma.payment.findFirst({
          where: {
            bookingId,
            status: {
              in: ["PENDING", "PAID"],
            },
          },
        });

      if (existingPayment) {
        return res.status(400).json({
          success: false,
          message: "A payment already exists for this booking.",
          data: existingPayment,
        });
      }

      const payment = await prisma.payment.create({
        data: {
          bookingId,
          amount,
          transactionId: transactionId || null,
          status: "PENDING",
        },
        include: {
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
        },
      });

      res.status(201).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      console.error("Failed to create payment:", error);

      res.status(500).json({
        success: false,
        message: "Failed to create payment",
      });
    }
  }
);


// UPDATE PAYMENT STATUS
router.patch(
  "/:id/status",
  requireAuth,
  requireRole("STUDENT", "PARENT", "ADMIN"),
  async (req, res) => {
    try {
      const { status } = req.body;

      const allowedStatuses = [
        "PENDING",
        "PAID",
        "FAILED",
        "REFUNDED",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment status.",
        });
      }

      const existingPayment =
        await prisma.payment.findUnique({
          where: {
            id: req.params.id,
          },
          include: {
            booking: true,
          },
        });

      if (!existingPayment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found.",
        });
      }

      // Admin can update any payment
      if (req.user.role !== "ADMIN") {
        const studentProfile =
          await prisma.studentProfile.findUnique({
            where: {
              userId: req.user.userId,
            },
          });

        if (
          !studentProfile ||
          existingPayment.booking.studentId !== studentProfile.id
        ) {
          return res.status(403).json({
            success: false,
            message: "You can only update your own payment.",
          });
        }

        // Students/parents cannot refund or mark failed manually
        if (status !== "PAID" && status !== "PENDING") {
          return res.status(403).json({
            success: false,
            message: "You do not have permission for this payment status.",
          });
        }
      }

      const payment =
        await prisma.payment.update({
          where: {
            id: req.params.id,
          },
          data: {
            status,
            paymentDate:
              status === "PAID"
                ? new Date()
                : undefined,
          },
        });

      res.json({
        success: true,
        data: payment,
      });
    } catch (error) {
      console.error(
        "Failed to update payment status:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Failed to update payment status",
      });
    }
  }
);


module.exports = router;
