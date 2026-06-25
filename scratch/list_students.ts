import prisma from "../src/lib/prisma.js";

async function main() {
  try {
    const students = await prisma.student.findMany({
      select: {
        tempId: true,
        fullName: true,
        email: true,
        status: true
      }
    });
    console.log("Students list:");
    console.log(JSON.stringify(students, null, 2));
  } catch (error) {
    console.error("Error connecting to database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
