const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tournamentId = "3daffcc1-dedb-4b6f-ac05-13c052242307";

  const district = await prisma.district.findFirst();
  const taluk = await prisma.taluk.findFirst();

  if (!district || !taluk) {
    console.log("No district or taluk found!");
    return;
  }

  const playersToSeed = [
    // Sub-Junior, 13 Years, Boys, 45kg (Born 2013)
    ...Array.from({length: 5}).map((_, i) => ({
      fullName: `Fake Seed Boy ${i+1}`,
      gender: "MALE",
      dob: new Date("2013-05-10"),
      age: 13,
      weight: "45",
      mobile: `98999000${i}1`,
      aadhaar: `99345678900${i}1`,
      email: `fakeboy${i}@example.com`
    })),
    // Mini Sub-Junior, 9 Years, Girls, 30kg (Born 2017)
    ...Array.from({length: 5}).map((_, i) => ({
      fullName: `Fake Seed Girl ${i+1}`,
      gender: "FEMALE",
      dob: new Date("2017-08-15"),
      age: 9,
      weight: "30",
      mobile: `98999000${i}2`,
      aadhaar: `99345678900${i}2`,
      email: `fakegirl${i}@example.com`
    }))
  ];

  for (const p of playersToSeed) {
    const existing = await prisma.student.findUnique({ where: { aadhaarNumber: p.aadhaar }});
    let studentId = existing?.id;
    if (!existing) {
      const student = await prisma.student.create({
        data: {
          tempId: `SEED-${p.aadhaar}`,
          districtId: district.id,
          talukId: taluk.id,
          pincode: "600001",
          fullName: p.fullName,
          gender: p.gender,
          dob: p.dob,
          age: p.age,
          bloodGroup: "O+",
          mobileNumber: p.mobile,
          email: p.email,
          aadhaarNumber: p.aadhaar,
          address: "Test Address",
          city: "Test City",
          state: "Test State",
          addressPincode: "600001",
          nationality: "Indian",
          annualIncome: 100000,
          schoolName: "Test School",
          grade: "5",
          password: "password123",
          status: "APPROVED",
          height: "150",
          weight: p.weight,
        }
      });
      studentId = student.id;
    }

    const reg = await prisma.tournamentRegistration.findUnique({
      where: {
        tournamentId_playerId: { tournamentId, playerId: studentId }
      }
    });

    if (!reg) {
      await prisma.tournamentRegistration.create({
        data: {
          tournamentId,
          playerId: studentId,
          status: "APPROVED",
          weight: p.weight,
          height: "150"
        }
      });
    }
  }

  console.log("Seeding complete! Added 5 boys in Sub-Junior (45kg) and 5 girls in Mini Sub-Junior (30kg).");
}

main().catch(console.error).finally(() => prisma.$disconnect());
