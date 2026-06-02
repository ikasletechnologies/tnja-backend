import prisma from "../src/lib/prisma.js";

async function main() {
  const students = await prisma.student.findMany({
    select: { fullName: true, clubId: true, isPaid: true }
  });
  console.log("Players:", JSON.stringify(students, null, 2));

  const tournaments = await prisma.tournament.findMany({
    select: { title: true, status: true, clubId: true }
  });
  console.log("Tournaments:", JSON.stringify(tournaments, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
