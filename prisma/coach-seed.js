const prisma = require("../server/prisma");

async function main() {
  const piano = await prisma.instrument.findUnique({
    where: {
      name: "Piano",
    },
  });

  if (!piano) {
    throw new Error("Piano instrument not found");
  }

  const user = await prisma.user.upsert({
    where: {
      email: "rahul.coach@example.com",
    },
    update: {},
    create: {
      name: "Rahul Sharma",
      email: "rahul.coach@example.com",
      phone: "9876543210",
      role: "COACH",
    },
  });

  const coach = await prisma.coachProfile.upsert({
    where: {
      userId: user.id,
    },
    update: {},
    create: {
      userId: user.id,
      bio: "Experienced piano coach for beginners and intermediate students.",
      experienceYears: 5,
      hourlyRate: 500,
      isVerified: true,
      backgroundCheck: true,
    },
  });

  await prisma.coachInstrument.upsert({
    where: {
      coachId_instrumentId: {
        coachId: coach.id,
        instrumentId: piano.id,
      },
    },
    update: {},
    create: {
      coachId: coach.id,
      instrumentId: piano.id,
    },
  });

  console.log("Sample coach seeded successfully 🎹");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });