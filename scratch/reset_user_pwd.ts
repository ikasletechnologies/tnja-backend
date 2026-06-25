import prisma from "../src/lib/prisma.js";
import bcrypt from "bcrypt";

async function main() {
  try {
    const hashedPassword = await bcrypt.hash("password123", 10);
    const updated = await prisma.student.updateMany({
      where: { tempId: "TEMP-STU-85CB20" },
      data: { password: hashedPassword }
    });
    console.log("Updated count:", updated.count);
  } catch (error) {
    console.error("Error updating password:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
