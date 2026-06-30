const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const members = await prisma.member.findMany({ 
    where: { role: 'DISTRICT_PRESIDENT' }, 
    include: { district: true, assignedDistrict: true } 
  });
  
  console.log('Current District Presidents:');
  console.log(JSON.stringify(members.map(m => ({ 
    id: m.id, 
    name: m.fullName, 
    perm: m.district?.name, 
    assigned: m.assignedDistrict?.name 
  })), null, 2));

  // Fix: If assigned is Karur but perm is not Karur, we reset assigned to their perm district.
  for (const m of members) {
    if (m.assignedDistrict?.name === 'Karur' && m.district?.name !== 'Karur') {
      await prisma.member.update({
        where: { id: m.id },
        data: { assignedDistrictId: m.districtId } // Reset assigned district to their permanent district
      });
      console.log(`Reset ${m.fullName} assigned district to ${m.district?.name}`);
    }
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
