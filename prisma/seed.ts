import prisma from "../src/lib/prisma.js";
import { readFileSync } from "fs";
import { join } from "path";

const locationsPath = join(process.cwd(), "prisma", "tn_locations.json");
const tnLocations = JSON.parse(readFileSync(locationsPath, "utf-8"));

const clubsToSeed = [
  {
    name: "Tamil Nadu Judo Academy",
    districtName: "Chennai",
    talukName: "Mylapore",
    pincode: "600004",
    mobileNumber: "9876543210",
    email: "tnja@example.com",
    address1: "123 Judo Street",
    president: "Mr. President",
    secretary: "Mr. Secretary",
    coach: "Head Coach",
    noOfStudents: 50,
    maleStudents: 30,
    femaleStudents: 20
  },
  {
    name: "Chennai Judo Club",
    districtName: "Chennai",
    talukName: "Adyar",
    pincode: "600020",
    mobileNumber: "9876543211",
    email: "chennaijudo@example.com",
    address1: "45 Adyar Main Road",
    president: "Mr. Chennai",
    secretary: "Mr. Adyar",
    coach: "Adyar Coach",
    noOfStudents: 40,
    maleStudents: 25,
    femaleStudents: 15
  },
  {
    name: "Madurai Martial Arts",
    districtName: "Madurai",
    talukName: "Madurai North",
    pincode: "625001",
    mobileNumber: "9876543212",
    email: "maduraimartial@example.com",
    address1: "10 Temple Street",
    president: "Mr. Madurai",
    secretary: "Mr. North",
    coach: "Madurai Coach",
    noOfStudents: 60,
    maleStudents: 40,
    femaleStudents: 20
  }
];

async function main() {
  console.log("Seeding Districts and Taluks from JSON...");

  for (const locationData of tnLocations) {
    const district = await prisma.district.upsert({
      where: { name: locationData.name },
      update: {},
      create: { name: locationData.name }
    });

    console.log(`Processing District: ${locationData.name}`);

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
        // console.log(`  Created Taluk: ${talukData.name}`);
      }
    }
  }

  console.log("Seeding Clubs...");
  for (const clubData of clubsToSeed) {
    const district = await prisma.district.findUnique({
      where: { name: clubData.districtName }
    });

    if (!district) continue;

    const taluk = await prisma.taluk.findFirst({
      where: { name: clubData.talukName, districtId: district.id }
    });

    if (!taluk) continue;

    const { districtName, talukName, ...clubInfo } = clubData;

    await prisma.club.upsert({
      where: { email: clubInfo.email },
      update: {
        ...clubInfo,
        districtId: district.id,
        talukId: taluk.id
      },
      create: {
        ...clubInfo,
        districtId: district.id,
        talukId: taluk.id
      }
    });
    console.log(`Upserted Club: ${clubInfo.name}`);
  }

  console.log("Seeding finished successfully!");
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
