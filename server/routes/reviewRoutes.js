const express = require("express");
const prisma = require("../prisma");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
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
});

router.post("/", async (req, res) => {
  try {
    const {
      bookingId,
      studentId,
      coachId,
      rating,
      comment,
    } = req.body;

    const review = await prisma.review.create({
      data: {
        bookingId,
        studentId,
        coachId,
        rating,
        comment,
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
});

module.exports = router;