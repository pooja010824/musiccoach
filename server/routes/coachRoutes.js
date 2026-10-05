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

    const ratingRows = await prisma.review.groupBy({
      by: ["coachId"],
      _avg: {
        rating: true,
      },
      _count: {
        rating: true,
      },
    });

    const ratings = new Map(
      ratingRows.map((row) => [
        row.coachId,
        {
          averageRating:
            row._avg.rating == null
              ? null
              : Number(row._avg.rating.toFixed(1)),
          reviewCount: row._count.rating,
        },
      ])
    );

    const publicCoaches = coaches.map((coach) => ({
      ...coach,
      averageRating:
        ratings.get(coach.id)?.averageRating ?? 5,
      reviewCount:
        ratings.get(coach.id)?.reviewCount ?? 0,
    }));

    res.json({
      success: true,
      data: publicCoaches,
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
