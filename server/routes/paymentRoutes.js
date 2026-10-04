const express = require("express");
const prisma = require("../prisma");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
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
});

router.post("/", async (req, res) => {
  try {
    const {
      bookingId,
      amount,
      transactionId,
    } = req.body;

    const payment = await prisma.payment.create({
      data: {
        bookingId,
        amount,
        transactionId,
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
});

router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    const payment = await prisma.payment.update({
      where: {
        id: req.params.id,
      },
      data: {
        status,
        paymentDate: status === "PAID" ? new Date() : undefined,
      },
    });

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error("Failed to update payment status:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update payment status",
    });
  }
});

module.exports = router;