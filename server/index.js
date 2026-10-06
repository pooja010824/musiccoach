const express = require("express");
const cors = require("cors");
const path = require("path");
const { seedDemoData } = require("./seedDemoData");

const app = express();

app.use(express.json());
app.use(cors());

const instrumentRoutes = require("./routes/instrumentRoutes");
const coachRoutes = require("./routes/coachRoutes");
const availabilityRoutes = require("./routes/availabilityRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const lessonRoutes = require("./routes/lessonRoutes");
const progressRoutes = require("./routes/progressRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const authRoutes = require("./routes/authRoutes");

app.use("/api/instruments", instrumentRoutes);
app.use("/api/coaches", coachRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/auth", authRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend is running 🚀",
  });
});

const distPath = path.join(__dirname, "../dist");

app.use(express.static(distPath));

app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api/")) {
    res.sendFile(path.join(distPath, "index.html"));
    return;
  }

  next();
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await seedDemoData();
  } catch (error) {
    console.error("Demo data seed failed:", error);
  }
});
