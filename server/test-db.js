const prisma = require("./prisma");

async function testDatabase() {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    console.log("Database connected successfully 🚀");
  } catch (error) {
    console.error("Database connection failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();