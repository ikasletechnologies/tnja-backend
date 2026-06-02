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

    // Seed sample Coach
    const sampleCoach = {
      tempId: "TEMP-COA-001",
      permanentId: "TNJA-COA-001",
      fullName: "Sensei Yadu",
      fatherName: "Judo Master",
      gender: "MALE" as Gender,
      dob: new Date("1980-01-01"),
      age: 46,
      bloodGroup: "A+",
      mobileNumber: "9876500003",
      email: "coach@example.com",
      aadhaarNumber: "123456789014",
      pincode: "600004",
      historyInJudo: "Black belt 5th Dan",
      historyInOtherMartial: "Karate",
      presentGradeInJudo: "5th Dan",
      deptName: "Sports",
      contactPersonDept: "Admin",
      addressDept: "Sports Complex",
      status: "APPROVED" as Status,
      isPaid: true,
      password: hashedPwd
    };

    const coach = await prisma.coachReferee.upsert({
      where: { email: sampleCoach.email },
      update: {
        ...sampleCoach,
        districtId: chennaiDistrict.id,
        talukId: mylaporeTaluk.id
      },
      create: {
        ...sampleCoach,
        districtId: chennaiDistrict.id,
        talukId: mylaporeTaluk.id
      }
    });
    console.log(`Upserted Coach: ${coach.fullName}`);

    // Seed multiple Players (Students)
    const playersToSeed = [
      {
        tempId: "TEMP-STU-001",
        permanentId: "TNJA-STU-001",
        fullName: "Rohan Kumar",
        gender: "MALE" as Gender,
        dob: new Date("2005-03-12"),
        age: 19,
        bloodGroup: "B+",
        mobileNumber: "9876500004",
        email: "rohan.kumar@example.com",
        aadhaarNumber: "100000000001",
        pincode: "600004",
        address: "12 Judo Apartments",
        city: "Chennai",
        state: "Tamil Nadu",
        addressPincode: "600004",
        nationality: "Indian",
        annualIncome: 450000,
        isBPL: false,
        schoolName: "TNJA Judo School",
        grade: "A",
        areaOfInterest: "Combat Sports",
        areaOfStudy: "Physical Education",
        preferLocation: "Chennai",
        status: "APPROVED" as Status,
        isPaid: true,
        password: hashedPwd,
        wins: 15,
        losses: 3,
        draws: 2,
        coachId: coach.id
      },
      {
        tempId: "TEMP-STU-002",
        permanentId: "TNJA-STU-002",
        fullName: "Priya Devi",
        gender: "FEMALE" as Gender,
        dob: new Date("2006-07-20"),
        age: 18,
        bloodGroup: "O+",
        mobileNumber: "9876500005",
        email: "priya.devi@example.com",
        aadhaarNumber: "100000000002",
        pincode: "600004",
        address: "5 Sports Colony, Mylapore",
        city: "Chennai",
        state: "Tamil Nadu",
        addressPincode: "600004",
        nationality: "Indian",
        annualIncome: 300000,
        isBPL: false,
        schoolName: "TNJA Judo School",
        grade: "A",
        areaOfInterest: "Judo",
        areaOfStudy: "Arts",
        preferLocation: "Chennai",
        status: "APPROVED" as Status,
        isPaid: true,
        password: hashedPwd,
        wins: 10,
        losses: 2,
        draws: 1,
        coachId: coach.id
      },
      {
        tempId: "TEMP-STU-003",
        permanentId: "TNJA-STU-003",
        fullName: "Arjun Selvam",
        gender: "MALE" as Gender,
        dob: new Date("2004-11-05"),
        age: 21,
        bloodGroup: "A+",
        mobileNumber: "9876500006",
        email: "arjun.selvam@example.com",
        aadhaarNumber: "100000000003",
        pincode: "600004",
        address: "8 Arunachalam Road",
        city: "Chennai",
        state: "Tamil Nadu",
        addressPincode: "600004",
        nationality: "Indian",
        annualIncome: 600000,
        isBPL: false,
        schoolName: "Adyar Martial Arts School",
        grade: "B",
        areaOfInterest: "Martial Arts",
        areaOfStudy: "Commerce",
        preferLocation: "Chennai",
        status: "APPROVED" as Status,
        isPaid: true,
        password: hashedPwd,
        wins: 8,
        losses: 5,
        draws: 3,
        coachId: coach.id
      },
      {
        tempId: "TEMP-STU-004",
        permanentId: "TNJA-STU-004",
        fullName: "Kavitha Suresh",
        gender: "FEMALE" as Gender,
        dob: new Date("2007-02-14"),
        age: 17,
        bloodGroup: "B-",
        mobileNumber: "9876500007",
        email: "kavitha.suresh@example.com",
        aadhaarNumber: "100000000004",
        pincode: "600004",
        address: "22 Besant Nagar, 3rd Cross",
        city: "Chennai",
        state: "Tamil Nadu",
        addressPincode: "600090",
        nationality: "Indian",
        annualIncome: 250000,
        isBPL: true,
        schoolName: "Chennai Government School",
        grade: "A",
        areaOfInterest: "Judo",
        areaOfStudy: "Science",
        preferLocation: "Chennai",
        status: "APPROVED" as Status,
        isPaid: true,
        password: hashedPwd,
        wins: 5,
        losses: 1,
        draws: 0,
        coachId: coach.id
      },
      {
        tempId: "TEMP-STU-005",
        permanentId: "TNJA-STU-005",
        fullName: "Murugan Pandian",
        gender: "MALE" as Gender,
        dob: new Date("2003-09-01"),
        age: 22,
        bloodGroup: "AB+",
        mobileNumber: "9876500008",
        email: "murugan.pandian@example.com",
        aadhaarNumber: "100000000005",
        pincode: "625001",
        address: "15 Mattuthavani, Madurai",
        city: "Madurai",
        state: "Tamil Nadu",
        addressPincode: "625001",
        nationality: "Indian",
        annualIncome: 350000,
        isBPL: false,
        schoolName: "Madurai Sports Academy",
        grade: "A",
        areaOfInterest: "Fighting",
        areaOfStudy: "Physical Education",
        preferLocation: "Madurai",
        status: "APPROVED" as Status,
        isPaid: true,
        password: hashedPwd,
        wins: 20,
        losses: 4,
        draws: 1,
        coachId: coach.id
      },
      {
        tempId: "TEMP-STU-006",
        permanentId: "TNJA-STU-006",
        fullName: "Deepika Rajendran",
        gender: "FEMALE" as Gender,
        dob: new Date("2005-06-30"),
        age: 19,
        bloodGroup: "O-",
        mobileNumber: "9876500009",
        email: "deepika.rajendran@example.com",
        aadhaarNumber: "100000000006",
        pincode: "625001",
        address: "3 Anna Nagar, Madurai",
        city: "Madurai",
        state: "Tamil Nadu",
        addressPincode: "625001",
        nationality: "Indian",
        annualIncome: 200000,
        isBPL: true,
        schoolName: "Madurai Girls School",
        grade: "A",
        areaOfInterest: "Judo",
        areaOfStudy: "Arts",
        preferLocation: "Madurai",
        status: "APPROVED" as Status,
        isPaid: true,
        password: hashedPwd,
        wins: 7,
        losses: 2,
        draws: 1,
        coachId: coach.id
      },
      {
        tempId: "TEMP-STU-007",
        permanentId: "TNJA-STU-007",
        fullName: "Vijay Anand",
        gender: "MALE" as Gender,
        dob: new Date("2008-01-15"),
        age: 16,
        bloodGroup: "A-",
        mobileNumber: "9876500010",
        email: "vijay.anand@example.com",
        aadhaarNumber: "100000000007",
        pincode: "600004",
        address: "9 Nungambakkam High Road",
        city: "Chennai",
        state: "Tamil Nadu",
        addressPincode: "600034",
        nationality: "Indian",
        annualIncome: 800000,
        isBPL: false,
        schoolName: "Chennai Public School",
        grade: "A",
        areaOfInterest: "Combat Sports",
        areaOfStudy: "Science",
        preferLocation: "Chennai",
        status: "APPROVED" as Status,
        isPaid: true,
        password: hashedPwd,
        wins: 3,
        losses: 1,
        draws: 0,
        coachId: coach.id
      },
      {
        tempId: "TEMP-STU-008",
        permanentId: "TNJA-STU-008",
        fullName: "Ananya Krishnan",
        gender: "FEMALE" as Gender,
        dob: new Date("2006-12-25"),
        age: 18,
        bloodGroup: "B+",
        mobileNumber: "9876500011",
        email: "ananya.krishnan@example.com",
        aadhaarNumber: "100000000008",
        pincode: "600020",
        address: "7 LB Road, Adyar",
        city: "Chennai",
        state: "Tamil Nadu",
        addressPincode: "600020",
        nationality: "Indian",
        annualIncome: 550000,
        isBPL: false,
        schoolName: "Adyar Sports School",
        grade: "A",
        areaOfInterest: "Judo",
        areaOfStudy: "Science",
        preferLocation: "Chennai",
        status: "APPROVED" as Status,
        isPaid: true,
        password: hashedPwd,
        wins: 12,
        losses: 0,
        draws: 2,
        coachId: coach.id
      },
      {
        tempId: "TEMP-STU-009",
        permanentId: "TNJA-STU-009",
        fullName: "Sarath Babu",
        gender: "MALE" as Gender,
        dob: new Date("2004-04-08"),
        age: 22,
        bloodGroup: "AB-",
        mobileNumber: "9876500012",
        email: "sarath.babu@example.com",
        aadhaarNumber: "100000000009",
        pincode: "625001",
        address: "1 Kalavasal, Madurai",
        city: "Madurai",
        state: "Tamil Nadu",
        addressPincode: "625002",
        nationality: "Indian",
        annualIncome: 180000,
        isBPL: true,
        schoolName: "Madurai Judo Academy",
        grade: "B",
        areaOfInterest: "Fighting",
        areaOfStudy: "Arts",
        preferLocation: "Madurai",
        status: "APPROVED" as Status,
        isPaid: true,
        password: hashedPwd,
        wins: 6,
        losses: 6,
        draws: 3,
        coachId: coach.id
      },
      {
        tempId: "TEMP-STU-010",
        permanentId: "TNJA-STU-010",
        fullName: "Lakshmi Priya",
        gender: "FEMALE" as Gender,
        dob: new Date("2007-08-18"),
        age: 17,
        bloodGroup: "O+",
        mobileNumber: "9876500013",
        email: "lakshmi.priya@example.com",
        aadhaarNumber: "100000000010",
        pincode: "600004",
        address: "33 T Nagar Main Road",
        city: "Chennai",
        state: "Tamil Nadu",
        addressPincode: "600017",
        nationality: "Indian",
        annualIncome: 420000,
        isBPL: false,
        schoolName: "T Nagar Judo Club School",
        grade: "A",
        areaOfInterest: "Judo",
        areaOfStudy: "Commerce",
        preferLocation: "Chennai",
        status: "APPROVED" as Status,
        isPaid: true,
        password: hashedPwd,
        wins: 9,
        losses: 3,
        draws: 1,
        coachId: coach.id
      }
    ];

    // Determine districtId/talukId per player based on city
    const maduraiDistrict = await prisma.district.findUnique({ where: { name: "Madurai" } });
    const maduraiNorthTaluk = maduraiDistrict
      ? await prisma.taluk.findFirst({ where: { name: "Madurai North", districtId: maduraiDistrict.id } })
      : null;

    // Fetch clubs to link players
    const chennaiClub = await prisma.club.findFirst({ where: { email: "tnja@example.com" } });
    const maduraiClub = await prisma.club.findFirst({ where: { email: "maduraimartial@example.com" } });

    for (const playerData of playersToSeed) {
      const isMadurai = playerData.city === "Madurai";
      const districtId = isMadurai && maduraiDistrict ? maduraiDistrict.id : chennaiDistrict.id;
      const talukId = isMadurai && maduraiNorthTaluk ? maduraiNorthTaluk.id : mylaporeTaluk.id;
      const clubId = isMadurai ? (maduraiClub?.id ?? null) : (chennaiClub?.id ?? null);

      const student = await prisma.student.upsert({
        where: { tempId: playerData.tempId },
        update: { ...playerData, districtId, talukId, clubId },
        create: { ...playerData, districtId, talukId, clubId }
      });
      console.log(`Upserted Player: ${student.fullName} (${student.gender}, ${student.city}) → Club: ${clubId ? "linked" : "none"}`);
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
