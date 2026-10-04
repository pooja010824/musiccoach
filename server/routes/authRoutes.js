const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../prisma");

const router = express.Router();

const JWT_SECRET =
  process.env.JWT_SECRET || "musiccoach-development-secret-change-in-production";

function signToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      role: user.role,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role = "STUDENT" } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!["STUDENT", "PARENT"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account type.",
      });
    }

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role,
        studentProfile: {
          create: {},
        },
      },
      include: {
        studentProfile: true,
      },
    });

    const token = signToken(user);

    res.status(201).json({
      success: true,
      message: "Account created successfully.",
      token,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentProfileId: user.studentProfile?.id || null,
      },
    });
  } catch (error) {
    console.error("Signup failed:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create account.",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: {
        studentProfile: true,
      },
    });

    if (!user?.passwordHash) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = signToken(user);

    res.json({
      success: true,
      message: "Login successful.",
      token,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentProfileId: user.studentProfile?.id || null,
      },
    });
  } catch (error) {
    console.error("Login failed:", error);

    res.status(500).json({
      success: false,
      message: "Unable to login.",
    });
  }
});

router.get("/me", async (req, res) => {
  try {
    const header = req.headers.authorization || "";

    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const token = header.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        studentProfile: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found.",
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentProfileId: user.studentProfile?.id || null,
      },
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired session.",
    });
  }
});

module.exports = router;
