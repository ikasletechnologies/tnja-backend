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
  
  const bcrypt = await import("bcrypt");
  const hashedPwd = await bcrypt.default.hash("password123", 10);

  // Define categories (10 players each per district)
  const categories = [
    { name: "Cat 1", age: 14, dob: new Date("2010-01-01"), weight: "40kg" },
    { name: "Cat 2", age: 16, dob: new Date("2008-01-01"), weight: "50kg" },
    { name: "Cat 3", age: 18, dob: new Date("2006-01-01"), weight: "60kg" },
    { name: "Cat 4", age: 20, dob: new Date("2004-01-01"), weight: "70kg" },
    { name: "Cat 5", age: 22, dob: new Date("2002-01-01"), weight: "80kg" },
  ];

  // 1. Create Dummy Tournament for Weight Registrations
  let tournament = await prisma.tournament.findFirst({
    where: { title: "Global Dummy Tournament" }
  });

  if (!tournament) {
    tournament = await prisma.tournament.create({
      data: {
        title: "Global Dummy Tournament",
        date: new Date(),
        location: "Chennai",
        description: "Dummy tournament for seeding weight categories.",
        status: "APPROVED",
        districtApproval: "APPROVED",
        stateApproval: "APPROVED",
        superAdminApproval: "APPROVED",
        ceoApproval: "APPROVED",
        level: "STATE",
      }
    });
    console.log("Created Global Dummy Tournament.");
  }

  let districtCounter = 1;
  let playerCounter = 1;
  let memberCounter = 1;
  let coachCounter = 1;

  for (const locationData of tnLocations) {
    const district = await prisma.district.upsert({
      where: { name: locationData.name },
      update: { zoneName: locationData.zone },
      create: { name: locationData.name, zoneName: locationData.zone }
    });

    console.log(`Processing District [${districtCounter}/38]: ${locationData.name}`);

    // Create Taluks
    let firstTaluk = null;
    for (const talukData of locationData.taluks) {
      const existingTaluk = await prisma.taluk.findFirst({
        where: { name: talukData.name, districtId: district.id }
      });

      let currentTaluk = existingTaluk;
      if (!existingTaluk) {
        currentTaluk = await prisma.taluk.create({
          data: {
            name: talukData.name,
            pincode: talukData.pincode,
            districtId: district.id
          }
        });
      }
      if (!firstTaluk) firstTaluk = currentTaluk;
    }

    if (!firstTaluk) continue;

    const distPrefix = `D${districtCounter}`;

    // Create Club
    const clubEmail = `club_${distPrefix}@example.com`;
    const club = await prisma.club.upsert({
      where: { email: clubEmail },
      update: {},
      create: {
        name: `${locationData.name} Dummy Club`,
        districtId: district.id,
        talukId: firstTaluk.id,
        pincode: firstTaluk.pincode,
        mobileNumber: `800000${districtCounter.toString().padStart(4, '0')}`,
        email: clubEmail,
        address1: `Dummy Club Address, ${locationData.name}`,
        president: "Dummy President",
        secretary: "Dummy Secretary",
        coach: "Dummy Coach",
        status: "APPROVED",
        isPaid: true
      }
    });

    // Create 7 Members
    for (let i = 1; i <= 7; i++) {
      const memEmail = `member_${distPrefix}_${i}@example.com`;
      await prisma.member.upsert({
        where: { email: memEmail },
        update: {},
        create: {
          tempId: `MEM-${distPrefix}-${i}`,
          districtId: district.id,
          talukId: firstTaluk.id,
          pincode: firstTaluk.pincode,
          fullName: `Member ${i} of ${locationData.name}`,
          fatherName: "Father",
          gender: "MALE",
          dob: new Date("1985-01-01"),
          bloodGroup: "O+",
          mobileNumber: `8111${districtCounter.toString().padStart(2, '0')}${i.toString().padStart(4, '0')}`,
          email: memEmail,
          aadhaarNumber: `1111${districtCounter.toString().padStart(4, '0')}${i.toString().padStart(4, '0')}`,
          addressLine1: `Member Address ${i}`,
          city: locationData.name,
          addressPincode: firstTaluk.pincode,
          role: i === 1 ? "DISTRICT_PRESIDENT" : "MEMBER",
          status: "APPROVED",
          password: hashedPwd,
          isPaid: true
        }
      });
      memberCounter++;
    }

    // Create 2 Coaches
    let coachRefs = [];
    for (let i = 1; i <= 2; i++) {
      const coachEmail = `coach_${distPrefix}_${i}@example.com`;
      const coach = await prisma.coachReferee.upsert({
        where: { email: coachEmail },
        update: {},
        create: {
          tempId: `COACH-${distPrefix}-${i}`,
          districtId: district.id,
          talukId: firstTaluk.id,
          pincode: firstTaluk.pincode,
          fullName: `Coach ${i} of ${locationData.name}`,
          fatherName: "Father",
          gender: "MALE",
          dob: new Date("1980-01-01"),
          age: 46,
          bloodGroup: "A+",
          mobileNumber: `8222${districtCounter.toString().padStart(2, '0')}${i.toString().padStart(4, '0')}`,
          email: coachEmail,
          aadhaarNumber: `2222${districtCounter.toString().padStart(4, '0')}${i.toString().padStart(4, '0')}`,
          historyInJudo: "Black belt",
          historyInOtherMartial: "None",
          presentGradeInJudo: "1st Dan",
          deptName: "Sports",
          contactPersonDept: "Admin",
          addressDept: "Sports Complex",
          status: "APPROVED",
          password: hashedPwd,
          isPaid: true,
          clubId: club.id
        }
      });
      coachRefs.push(coach);
      coachCounter++;
    }

    // Create 100 Players (5 categories x 10 Male, 10 Female players)
    for (const cat of categories) {
      for (let i = 1; i <= 20; i++) {
        const pIndex = playerCounter;
        const isFemale = i > 10;
        const playerEmail = `player_${distPrefix}_${cat.age}y_${isFemale ? 'f' : 'm'}_${i}@example.com`;
        
        const distStr = districtCounter.toString().padStart(2, '0');
        const catIdxStr = categories.indexOf(cat).toString();
        const genStr = isFemale ? '1' : '0';
        const iStr = i.toString().padStart(2, '0');
        const uniqueSuffix = `${distStr}${catIdxStr}${genStr}${iStr}`;

        const student = await prisma.student.upsert({
          where: { email: playerEmail },
          update: {
            gender: isFemale ? "FEMALE" : "MALE"
          }, // Update gender if they already exist
          create: {
            tempId: `STU-${distPrefix}-${cat.age}-${isFemale ? 'F' : 'M'}-${i}`,
            districtId: district.id,
            talukId: firstTaluk.id,
            pincode: firstTaluk.pincode,
            fullName: `Player ${i} (${cat.age}y) ${isFemale ? 'Female' : 'Male'} ${locationData.name}`,
            gender: isFemale ? "FEMALE" : "MALE",
            dob: cat.dob,
            age: cat.age,
            bloodGroup: "B+",
            mobileNumber: `8333${uniqueSuffix}`,
            email: playerEmail,
            aadhaarNumber: `333300${uniqueSuffix}`,
            address: `Player Address ${i}`,
            city: locationData.name,
            state: "Tamil Nadu",
            addressPincode: firstTaluk.pincode,
            nationality: "Indian",
            annualIncome: 300000,
            schoolName: "Dummy School",
            grade: "A",
            status: "APPROVED",
            isPaid: true,
            password: hashedPwd,
            coachId: coachRefs[0].id,
            clubId: club.id
          }
        });
        
        // Register to tournament to store weight
        await prisma.tournamentRegistration.upsert({
          where: {
            tournamentId_playerId: {
              tournamentId: tournament.id,
              playerId: student.id
            }
          },
          update: {},
          create: {
            tournamentId: tournament.id,
            playerId: student.id,
            status: "APPROVED",
            isPaid: true,
            weight: cat.weight,
            height: "160cm"
          }
        });
        playerCounter++;
      }
    }
    
    districtCounter++;
  }
  
  console.log("Seeding finished successfully!");
  console.log(`Total Districts Processed: ${districtCounter - 1}`);
  console.log(`Total Members Seeded: ${memberCounter - 1}`);
  console.log(`Total Coaches Seeded: ${coachCounter - 1}`);
  console.log(`Total Players Seeded: ${playerCounter - 1}`);
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