import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Tamil Nadu Judo Association — Seeding ONLY Districts & Taluks');
  console.log('\n═══════════════════════════════════════════════════════\n');

  console.log('🗑️  Cleaning existing data...');
  await prisma.tournamentMat.deleteMany();
  await prisma.tournamentDraw.deleteMany();
  await prisma.tournamentRegistration.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.student.deleteMany();
  await prisma.member.deleteMany();
  await prisma.coachReferee.deleteMany();
  await prisma.club.deleteMany();
  await prisma.taluk.deleteMany();
  await prisma.district.deleteMany();
  console.log('✅ Database cleaned');

  console.log('\n📍 Creating Districts & Taluks from tn_locations.json...');
  const districtRecs: { id: string; name: string; talukId: string }[] = [];
  
  const locationsData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'prisma', 'tn_locations.json'), 'utf8'));

  for (const dist of locationsData) {
    const d = await prisma.district.create({
      data: {
        name: dist.name,
        zoneName: dist.zone,
        taluks: {
          create: dist.taluks.map((t: any) => ({
            name: t.name,
            pincode: t.pincode,
          })),
        },
      },
      include: { taluks: true },
    });
    districtRecs.push({ id: d.id, name: d.name, talukId: d.taluks[0].id });
  }
  console.log(`✅ ${districtRecs.length} Districts created`);

  console.log('\n' + '═'.repeat(55));
  console.log('              SEED COMPLETE — SUMMARY              ');
  console.log('═'.repeat(55));
  console.log(`  ✅ Tamil Nadu Districts      : ${districtRecs.length}`);
  console.log('═'.repeat(55));
  console.log('\nNote: No Admin users, players, or tournaments were created.\n');
}

main()
  .catch((e) => {
    console.error('\n❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
