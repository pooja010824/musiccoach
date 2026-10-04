const express = require("express");
const prisma = require("../prisma");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const instruments = await prisma.instrument.findMany({
      orderBy: {
        name: "asc",
      },
    });

    res.json({
      success: true,
      data: instruments,
    });
  } catch (error) {
    console.error("Failed to fetch instruments:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch instruments",
    });
  }
});

module.exports = router;