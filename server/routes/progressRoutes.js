const express = require("express");
const prisma = require("../prisma");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

const progressInclude = {
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
};

router.get(
  "/",
  requireAuth,
  requireRole("STUDENT", "PARENT", "COACH", "ADMIN"),
  async (req, res) => {
    try {
      const where =
        req.user.role === "ADMIN"
          ? {}
          : req.user.role === "COACH"
            ? { lesson: { booking: { coach: { userId: req.user.userId } } } }
            : { lesson: { booking: { student: { userId: req.user.userId } } } };

      const progressNotes = await prisma.progressNote.findMany({
        where,
        include: progressInclude,
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
  }
);

router.post(
  "/",
  requireAuth,
  requireRole("COACH", "ADMIN"),
  async (req, res) => {
    try {
      const {
        lessonId,
        summary,
        strengths,
        improvements,
        homework,
      } = req.body;

      if (!lessonId) {
        return res.status(400).json({
          success: false,
          message: "Lesson ID is required.",
        });
      }

      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { booking: true },
      });

      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: "Lesson not found.",
        });
      }

      if (req.user.role === "COACH") {
        const coach = await prisma.coachProfile.findUnique({
          where: { userId: req.user.userId },
        });

        if (!coach || lesson.booking.coachId !== coach.id) {
          return res.status(403).json({
            success: false,
            message: "You can only add progress for your own lessons.",
          });
        }
      }

      const progressNote = await prisma.progressNote.create({
        data: {
          lessonId,
          summary: summary || null,
          strengths: strengths || null,
          improvements: improvements || null,
          homework: homework || null,
        },
        include: progressInclude,
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
  }
);

module.exports = router;
