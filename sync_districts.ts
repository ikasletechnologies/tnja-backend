import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const presidents = await prisma.member.findMany({
    where: {
      role: {
        in: ['DISTRICT_PRESIDENT', 'DISTRICT_SECRETARY']
      }
    }
  });

  for (const p of presidents) {
    if (p.assignedDistrictId !== p.districtId) {
      await prisma.member.update({
        where: { id: p.id },
        data: { assignedDistrictId: p.districtId }
      });
      console.log(`Updated ${p.fullName} (${p.tempId}) assignedDistrictId to ${p.districtId}`);
    }
  }
  console.log("Done syncing assigned districts.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
