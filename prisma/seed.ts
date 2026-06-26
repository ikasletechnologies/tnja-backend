import prisma from "../src/lib/prisma.js";
import { Gender, Status, MemberRole, EventLevel } from "@prisma/client";
import { readFileSync } from "fs";
import path, { join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const locationsPath = join(__dirname, "tn_locations.json");
const tnLocations = JSON.parse(readFileSync(locationsPath, "utf-8"));

async function main() {
  console.log("Seeding Districts and Taluks from JSON...");

  let districtCounter = 1;

  for (const locationData of tnLocations) {
    const district = await prisma.district.upsert({
      where: { name: locationData.name },
      update: { zoneName: locationData.zone },
      create: { name: locationData.name, zoneName: locationData.zone }
    });

    console.log(`Processing District [${districtCounter}/38]: ${locationData.name}`);

    // Create Taluks
    for (const talukData of locationData.taluks) {
      const existingTaluk = await prisma.taluk.findFirst({
        where: { name: talukData.name, districtId: district.id }
      });

      if (!existingTaluk) {
        await prisma.taluk.create({
          data: {
            name: talukData.name,
            pincode: talukData.pincode,
            districtId: district.id
          }
        });
      }
    }
    
    districtCounter++;
  }
  
  console.log("Seeding finished successfully!");
  console.log(`Total Districts Processed: ${districtCounter - 1}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
