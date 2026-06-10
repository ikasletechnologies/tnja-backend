import prisma from "./src/lib/prisma.js";

async function main() {
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);

  console.log("Updating existing users...");
  
  const s = await prisma.student.updateMany({
    where: { isPaid: true, validUntil: null },
    data: { validUntil: nextYear }
  });
  
  const c = await prisma.coachReferee.updateMany({
    where: { isPaid: true, validUntil: null },
    data: { validUntil: nextYear }
  });
  
  const m = await prisma.member.updateMany({
    where: { isPaid: true, validUntil: null },
    data: { validUntil: nextYear }
  });
  
  const cl = await prisma.club.updateMany({
    where: { isPaid: true, validUntil: null },
    data: { validUntil: nextYear }
  });

  console.log(`Updated Students: ${s.count}`);
  console.log(`Updated Coaches: ${c.count}`);
  console.log(`Updated Members: ${m.count}`);
  console.log(`Updated Clubs: ${cl.count}`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
