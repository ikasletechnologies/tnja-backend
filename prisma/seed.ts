import prisma from "../src/lib/prisma.js";
import { Gender, Status, MemberRole } from "@prisma/client";
import { readFileSync } from "fs";
import path, { join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const locationsPath = join(__dirname, "tn_locations.json");
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
        talukId: taluk.id,
        status: "APPROVED" // Seeded clubs should be approved for testing
      },
      create: {
        ...clubInfo,
        districtId: district.id,
        talukId: taluk.id,
        status: "APPROVED"
      }
    });
    console.log(`Upserted Club: ${clubInfo.name}`);
  }

  console.log("Seeding Members...");
  const chennaiDistrict = await prisma.district.findUnique({ where: { name: "Chennai" } });
  const mylaporeTaluk = await prisma.taluk.findFirst({ where: { name: "Mylapore", districtId: chennaiDistrict?.id } });

  if (chennaiDistrict && mylaporeTaluk) {
    const sampleMembers = [
      {
        tempId: "MEM-TEMP-001",
        permanentId: "TNJA-MEM-001",
        fullName: "Manikandan M",
        email: "mani@example.com",
        mobileNumber: "9876500001",
        fatherName: "Muthu",
        gender: "MALE" as Gender,
        dob: new Date("1990-01-01"),
        bloodGroup: "O+",
        aadhaarNumber: "123456789012",
        addressLine1: "No 1, Judo Street",
        city: "Chennai",
        addressPincode: "600004",
        pincode: "600004",
        status: "APPROVED" as Status,
        role: "MEMBER" as MemberRole,
        password: "" // will be hashed below
      },
      {
        tempId: "MEM-TEMP-002",
        permanentId: "TNJA-MEM-002",
        fullName: "Anitha R",
        email: "anitha@example.com",
        mobileNumber: "9876500002",
        fatherName: "Ramesh",
        gender: "FEMALE" as Gender,
        dob: new Date("1992-05-15"),
        bloodGroup: "A+",
        aadhaarNumber: "123456789013",
        addressLine1: "No 2, Sports Colony",
        city: "Chennai",
        addressPincode: "600004",
        pincode: "600004",
        status: "APPROVED" as Status,
        role: "DISTRICT_PRESIDENT" as MemberRole,
        password: "" // will be hashed below
      }
    ];

    const bcrypt = await import("bcrypt");
    const hashedPwd = await bcrypt.default.hash("password123", 10);
    sampleMembers[0].password = hashedPwd;
    sampleMembers[1].password = hashedPwd;

    for (const memberData of sampleMembers) {
      await prisma.member.upsert({
        where: { email: memberData.email },
        update: {
          ...memberData,
          districtId: chennaiDistrict.id,
          talukId: mylaporeTaluk.id
        },
        create: {
          ...memberData,
          districtId: chennaiDistrict.id,
          talukId: mylaporeTaluk.id
        }
      });
      console.log(`Upserted Member: ${memberData.fullName}`);
    }
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
