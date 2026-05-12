import prisma from "../src/lib/prisma.js";

async function main() {
  const districtId = "95d8f233-9d64-46ae-881f-622b637ff0e0"; // Chennai
  try {
    const taluks = await prisma.taluk.findMany({
      where: { districtId },
      orderBy: { name: 'asc' }
    });
    console.log(`Taluks for District ID ${districtId} (Chennai):`);
    console.log(JSON.stringify(taluks, null, 2));
  } catch (error) {
    console.error("Error fetching taluks:", error);
  } finally {
    process.exit(0);
  }
}

main();
