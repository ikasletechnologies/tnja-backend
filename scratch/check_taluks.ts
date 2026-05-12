import prisma from "../src/lib/prisma.js";

async function main() {
  try {
    const taluks = await prisma.taluk.findMany({
      take: 10,
      include: {
        district: true
      }
    });
    console.log("Taluks in DB count (first 10):", taluks.length);
    console.log(JSON.stringify(taluks, null, 2));
    
    const totalTaluks = await prisma.taluk.count();
    console.log("Total Taluks in DB:", totalTaluks);
  } catch (error) {
    console.error("Error fetching taluks:", error);
  } finally {
    process.exit(0);
  }
}

main();
