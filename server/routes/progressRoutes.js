const express = require("express");
const prisma = require("../prisma");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const progressNotes = await prisma.progressNote.findMany({
      include: {
        lesson: {
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
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      data: progressNotes,
    });
  } catch (error) {
    console.error("Failed to fetch progress notes:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch progress notes",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      lessonId,
      summary,
      strengths,
      improvements,
      homework,
    } = req.body;

    const progressNote = await prisma.progressNote.create({
      data: {
        lessonId,
        summary,
        strengths,
        improvements,
        homework,
      },
      include: {
        lesson: {
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
        },
      },
    });

    res.status(201).json({
      success: true,
      data: progressNote,
    });
  } catch (error) {
    console.error("Failed to create progress note:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create progress note",
    });
  }
});

module.exports = router;