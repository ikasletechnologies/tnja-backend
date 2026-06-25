import prisma from "../src/lib/prisma.js";

async function main() {
  try {
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { tempId: "TEMP-STU-EB872B" },
          { tempId: "TEMP-STU-EB872B".toLowerCase() }
        ]
      }
    });
    console.log("Student found:", student ? {
      id: student.id,
      tempId: student.tempId,
      fullName: student.fullName,
      email: student.email,
      status: student.status,
      hasPassword: !!student.password
    } : "null");
  } catch (error) {
    console.error("Error querying db:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
