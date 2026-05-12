import prisma from "../src/lib/prisma.js";

async function main() {
  try {
    const clubs = await prisma.club.findMany();
    console.log("Clubs in DB:", JSON.stringify(clubs, null, 2));
  } catch (error) {
    console.error("Error fetching clubs:", error);
  } finally {
    process.exit(0);
  }
}

main();
