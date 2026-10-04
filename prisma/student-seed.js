const prisma = require("../server/prisma");

async function main() {
  const user = await prisma.user.upsert({
    where: {
      email: "student@example.com",
    },
    update: {},
    create: {
      name: "Aarav Kumar",
      email: "student@example.com",
      phone: "9876543211",
      role: "STUDENT",
    },
  });

  const student = await prisma.studentProfile.upsert({
    where: {
      userId: user.id,
    },
    update: {},
    create: {
      userId: user.id,
      age: 14,
      skillLevel: "Beginner",
      learningGoal: "Learn piano from basics",
    },
  });

  console.log("Sample student seeded successfully 🎹");
  console.log(student);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });