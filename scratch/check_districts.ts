import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkDistricts() {
  console.log("--- MEMBERS ---");
  const members = await prisma.member.findMany({
    select: { id: true, fullName: true, districtId: true, district: { select: { name: true } } }
  });
  members.forEach(m => console.log(`${m.fullName} (${m.id}): District: ${m.district?.name} (${m.districtId})`));

  console.log("\n--- PENDING STUDENTS ---");
  const students = await prisma.student.findMany({
    where: { status: "PENDING" },
    select: { id: true, fullName: true, districtId: true, district: { select: { name: true } } }
  });
  students.forEach(s => console.log(`${s.fullName} (${s.id}): District: ${s.district?.name} (${s.districtId})`));
}

checkDistricts()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
