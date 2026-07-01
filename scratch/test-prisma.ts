import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const members = await prisma.member.findMany({ take: 5 });
    console.log("Successfully fetched members:", members.length);
  } catch (error) {
    console.error("Error fetching members:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
