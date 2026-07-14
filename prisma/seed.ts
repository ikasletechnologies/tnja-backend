import { PrismaClient, Status, Gender, MemberRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

let _seq = 1000;
function nextSeq(): number {
  return _seq++;
}

function uniqueMobile(): string {
  const n = nextSeq();
  return `9${n.toString().padStart(9, '0')}`;
}

function uniqueAadhaar(): string {
  const n = nextSeq();
  return `2${n.toString().padStart(11, '0')}`;
}

function uid(): string {
  return nextSeq().toString().padStart(7, '0');
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const districtsList = [
  // Chennai Zone
  { name: 'Chennai', zoneName: 'Chennai Zone' },
  { name: 'Chengalpattu', zoneName: 'Chennai Zone' },
  { name: 'Kancheepuram', zoneName: 'Chennai Zone' },
  { name: 'Tiruvallur', zoneName: 'Chennai Zone' },
  { name: 'Vellore', zoneName: 'Chennai Zone' },
  { name: 'Ranipet', zoneName: 'Chennai Zone' },
  { name: 'Tirupathur', zoneName: 'Chennai Zone' },
  { name: 'Tiruvannamalai', zoneName: 'Chennai Zone' },
  // Coimbatore Zone
  { name: 'Viluppuram', zoneName: 'Coimbatore Zone' },
  { name: 'Kallakurichi', zoneName: 'Coimbatore Zone' },
  { name: 'Coimbatore', zoneName: 'Coimbatore Zone' },
  { name: 'Karur', zoneName: 'Coimbatore Zone' },
  { name: 'Dindigul', zoneName: 'Coimbatore Zone' },
  // Trichy Zone
  { name: 'Cuddalore', zoneName: 'Trichy Zone' },
  { name: 'Tiruchirappalli', zoneName: 'Trichy Zone' },
  { name: 'Perambalur', zoneName: 'Trichy Zone' },
  { name: 'Ariyalur', zoneName: 'Trichy Zone' },
  { name: 'Pudukkottai', zoneName: 'Trichy Zone' },
  { name: 'Thanjavur', zoneName: 'Trichy Zone' },
  { name: 'Nagapattinam', zoneName: 'Trichy Zone' },
  { name: 'Mayiladuthurai', zoneName: 'Trichy Zone' },
  { name: 'Tiruvarur', zoneName: 'Trichy Zone' },
  // Salem Zone
  { name: 'Salem', zoneName: 'Salem Zone' },
  { name: 'Namakkal', zoneName: 'Salem Zone' },
  { name: 'Dharmapuri', zoneName: 'Salem Zone' },
  { name: 'Krishnagiri', zoneName: 'Salem Zone' },
  { name: 'Erode', zoneName: 'Salem Zone' },
  { name: 'Tiruppur', zoneName: 'Salem Zone' },
  { name: 'Nilgiris', zoneName: 'Salem Zone' },
  // Madurai Zone
  { name: 'Madurai', zoneName: 'Madurai Zone' },
  { name: 'Theni', zoneName: 'Madurai Zone' },
  { name: 'Sivagangai', zoneName: 'Madurai Zone' },
  { name: 'Ramanathapuram', zoneName: 'Madurai Zone' },
  { name: 'Virudhunagar', zoneName: 'Madurai Zone' },
  { name: 'Tirunelveli', zoneName: 'Madurai Zone' },
  { name: 'Tenkasi', zoneName: 'Madurai Zone' },
  { name: 'Thoothukudi', zoneName: 'Madurai Zone' },
  { name: 'Kanniyakumari', zoneName: 'Madurai Zone' }
];

async function main() {
  console.log('🚀 Tamil Nadu Judo Association — Minimal Seed');
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

  console.log('\n📍 Creating 38 Districts & Taluks...');
  const districtRecs: { id: string; name: string; talukId: string }[] = [];

  for (const dist of districtsList) {
    const d = await prisma.district.create({
      data: {
        name: dist.name,
        zoneName: dist.zoneName,
        taluks: {
          create: [{ name: `${dist.name} Central Taluk`, pincode: `6${randomInt(10000, 99999)}` }],
        },
      },
      include: { taluks: true },
    });
    districtRecs.push({ id: d.id, name: d.name, talukId: d.taluks[0].id });
  }
  console.log(`✅ ${districtRecs.length} Districts created`);

  console.log('\n👑 Creating Super Admin...');
  const d = districtRecs.find(dist => dist.name === 'Chennai') || districtRecs[0];
  const id = uid();
  const hashedPassword = await bcrypt.hash('Seed@1234', 10);
  await prisma.member.create({
    data: {
      tempId: `ADMIN${id}`,
      fullName: 'Super Admin',
      fatherName: 'System',
      gender: Gender.MALE,
      dob: new Date(1980, 0, 1),
      bloodGroup: 'O+',
      mobileNumber: uniqueMobile(),
      email: 'admin@tnja.in',
      aadhaarNumber: uniqueAadhaar(),
      addressLine1: 'TNJA State Headquarters',
      city: 'Chennai',
      addressPincode: '600002',
      pincode: '600002',
      districtId: d.id,
      talukId: d.talukId,
      role: MemberRole.CEO,
      status: Status.APPROVED,
      password: hashedPassword,
    },
  });
  console.log(`✅ Super Admin created (Email: admin@tnja.in | Password: Seed@1234)`);

  console.log('\n' + '═'.repeat(55));
  console.log('              SEED COMPLETE — SUMMARY              ');
  console.log('═'.repeat(55));
  console.log(`  ✅ Tamil Nadu Districts      : ${districtRecs.length}`);
  console.log(`  ✅ Super Admin               : 1`);
  console.log('═'.repeat(55));
  console.log('\n  🔑 Admin Login: admin@tnja.in / Seed@1234\n');
}

main()
  .catch((e) => {
    console.error('\n❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });