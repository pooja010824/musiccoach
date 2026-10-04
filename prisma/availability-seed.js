const prisma = require("../server/prisma");

async function main() {
  const coach = await prisma.coachProfile.findFirst({
    where: {
      user: {
        email: "rahul.coach@example.com",
      },
    },
  });

  if (!coach) {
    throw new Error("Coach not found");
  }

  const availability = [
    {
      dayOfWeek: 1,
      startTime: "17:00",
      endTime: "19:00",
    },
    {
      dayOfWeek: 3,
      startTime: "17:00",
      endTime: "19:00",
    },
    {
      dayOfWeek: 6,
      startTime: "10:00",
      endTime: "13:00",
    },
  ];

  for (const slot of availability) {
    await prisma.availability.create({
      data: {
        coachId: coach.id,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
      },
    });
  }

  console.log("Coach availability seeded successfully 🗓️");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });