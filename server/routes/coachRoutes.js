const express = require("express");
const prisma = require("../prisma");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const coaches = await prisma.coachProfile.findMany({
      include: {
        user: true,
        instruments: {
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
      data: coaches,
    });
  } catch (error) {
    console.error("Failed to fetch coaches:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch coaches",
    });
  }
});

module.exports = router;