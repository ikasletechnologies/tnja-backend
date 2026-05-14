import prisma from "../src/lib/prisma.js";

async function check() {
  const districts = await prisma.district.findMany();
  console.log("Districts:", districts);
  
  const members = await prisma.member.findMany({
    include: { district: true }
  });
  console.log("Members and their districts:");
  members.forEach(m => console.log(`${m.fullName}: ${m.district?.name} (${m.districtId})`));

  const students = await prisma.student.findMany({
    where: { status: "PENDING" },
    include: { district: true }
  });
  console.log("Pending Students and their districts:");
  students.forEach(s => console.log(`${s.fullName}: ${s.district?.name} (${s.districtId})`));
}

check();
