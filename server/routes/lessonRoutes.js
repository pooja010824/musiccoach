const express = require("express");
const prisma = require("../prisma");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const lessons = await prisma.lesson.findMany({
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
});

router.post("/", async (req, res) => {
  try {
    const {
      bookingId,
      date,
      notes,
      homework,
    } = req.body;

    const lesson = await prisma.lesson.create({
      data: {
        bookingId,
        date: new Date(date),
        notes,
        homework,
        status: "SCHEDULED",
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
      data: lesson,
    });
  } catch (error) {
    console.error("Failed to create lesson:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create lesson",
    });
  }
});
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    const lesson = await prisma.lesson.update({
      where: {
        id: req.params.id,
      },
      data: {
        status,
      },
    });

    res.json({
      success: true,
      data: lesson,
    });
  } catch (error) {
    console.error("Failed to update lesson status:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update lesson status",
    });
  }
});

module.exports = router;