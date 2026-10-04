const express = require("express");
const prisma = require("../prisma");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const availability = await prisma.availability.findMany({
      include: {
        coach: {
          include: {
            user: true,
          },
        },
      },
      orderBy: [
        {
          dayOfWeek: "asc",
        },
        {
          startTime: "asc",
        },
      ],
    });

    res.json({
      success: true,
      data: availability,
    });
  } catch (error) {
    console.error("Failed to fetch availability:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch availability",
    });
  }
});

module.exports = router;