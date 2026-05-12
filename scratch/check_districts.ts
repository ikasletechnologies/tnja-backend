import prisma from "../src/lib/prisma.js";

async function main() {
  try {
    const districts = await prisma.district.findMany();
    console.log("Districts in DB:", districts.length);
    console.log(JSON.stringify(districts, null, 2));
  } catch (error) {
    console.error("Error fetching districts:", error);
  } finally {
    process.exit(0);
  }
}

main();
