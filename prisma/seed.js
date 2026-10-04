const prisma = require("../server/prisma");

async function main() {
  const instruments = [
    "Piano",
    "Violin",
    "Vocal",
  ];

  for (const name of instruments) {
    await prisma.instrument.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log("Instruments seeded successfully 🎵");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });