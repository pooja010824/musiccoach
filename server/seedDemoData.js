const prisma = require("./prisma");

const DEMO_STUDENT_ID = "cmutjdrzy0001pgf6h68o09v5";

async function seedDemoData() {
  console.log("Checking MusicCoach demo data...");

  const instruments = {};

  for (const name of ["Piano", "Violin", "Vocal"]) {
    instruments[name] = await prisma.instrument.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const coaches = [
    {
      name: "Rahul Sharma",
      email: "rahul@musiccoach.demo",
      bio: "Experienced piano coach offering personalized one-to-one lessons.",
      experienceYears: 5,
      hourlyRate: 500,
      instrument: "Piano",
    },
    {
      name: "Priya Mehta",
      email: "priya@musiccoach.demo",
      bio: "Experienced violin coach focused on classical and modern performance.",
      experienceYears: 7,
      hourlyRate: 600,
      instrument: "Violin",
    },
    {
      name: "Ananya Verma",
      email: "ananya@musiccoach.demo",
      bio: "Experienced vocal coach helping students build confidence and performance skills.",
      experienceYears: 6,
      hourlyRate: 550,
      instrument: "Vocal",
    },
  ];

  for (const item of coaches) {
    const user = await prisma.user.upsert({
      where: { email: item.email },
      update: {
        name: item.name,
        role: "COACH",
      },
      create: {
        name: item.name,
        email: item.email,
        role: "COACH",
      },
    });

    const coach = await prisma.coachProfile.upsert({
      where: { userId: user.id },
      update: {
        bio: item.bio,
        experienceYears: item.experienceYears,
        hourlyRate: item.hourlyRate,
        isVerified: true,
        backgroundCheck: true,
      },
      create: {
        userId: user.id,
        bio: item.bio,
        experienceYears: item.experienceYears,
        hourlyRate: item.hourlyRate,
        isVerified: true,
        backgroundCheck: true,
      },
    });

    await prisma.coachInstrument.upsert({
      where: {
        coachId_instrumentId: {
          coachId: coach.id,
          instrumentId: instruments[item.instrument].id,
        },
      },
      update: {},
      create: {
        coachId: coach.id,
        instrumentId: instruments[item.instrument].id,
      },
    });

    console.log("Ready:", item.name);
  }

  const studentEmail = "pooja.demo@musiccoach.local";

  let studentUser = await prisma.user.findUnique({
    where: { email: studentEmail },
  });

  if (!studentUser) {
    studentUser = await prisma.user.create({
      data: {
        id: "demo-student-user-001",
        name: "Pooja Sahu",
        email: studentEmail,
        role: "STUDENT",
      },
    });
  }

  const existingStudentProfile =
    await prisma.studentProfile.findUnique({
      where: { userId: studentUser.id },
    });

  if (!existingStudentProfile) {
    await prisma.studentProfile.create({
      data: {
        id: DEMO_STUDENT_ID,
        userId: studentUser.id,
      },
    });
  }

  console.log("Demo student ready.");
  console.log("MusicCoach demo data check complete.");
}

module.exports = { seedDemoData };
