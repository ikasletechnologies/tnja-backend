import { PrismaClient, EventLevel, Status, Gender, MemberRole } from '@prisma/client';
import { hash } from 'bcrypt';
import crypto from 'crypto';
import { getAgeGroup, getWeightCategory } from '../src/controllers/tournamentController.js';

const prisma = new PrismaClient();

// ============================================================
// UTILITY — Unique ID / Mobile / Aadhaar Generators
// ============================================================

let _seq = 1000; // start offset so IDs never conflict

function nextSeq(): number {
  return _seq++;
}

/** 10-digit unique mobile number */
function uniqueMobile(): string {
  const n = nextSeq();
  return `9${n.toString().padStart(9, '0')}`;
}

/** 12-digit unique Aadhaar number */
function uniqueAadhaar(): string {
  const n = nextSeq();
  return `2${n.toString().padStart(11, '0')}`;
}

/** Short unique tempId suffix */
function uid(): string {
  return nextSeq().toString().padStart(7, '0');
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================================
// DATA CONSTANTS
// ============================================================



const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

const maleFirstNames = [
  'Arjun', 'Karthik', 'Vijay', 'Ravi', 'Suresh', 'Ramesh', 'Kumar', 'Ganesh',
  'Murugan', 'Selvam', 'Dinesh', 'Arun', 'Sathish', 'Praveen', 'Lokesh',
  'Mani', 'Bala', 'Raja', 'Senthil', 'Hari', 'Anand', 'Kumaran', 'Prasad',
  'Vignesh', 'Surya', 'Deva', 'Manoj', 'Siva', 'Muthu', 'Pandian',
  'Rajesh', 'Mahesh', 'Rakesh', 'Nithin', 'Gowtham', 'Naveen', 'Saravana',
  'Bharath', 'Priyan', 'Ashwin',
];

const femaleFirstNames = [
  'Priya', 'Lakshmi', 'Kavitha', 'Meena', 'Saranya', 'Deepa', 'Anitha',
  'Revathi', 'Sangeetha', 'Nithya', 'Divya', 'Asha', 'Rekha', 'Suganya',
  'Karthika', 'Devi', 'Kamala', 'Selvi', 'Vasantha', 'Vijayalakshmi',
  'Padmavathi', 'Geetha', 'Malathi', 'Usha', 'Prema', 'Lavanya', 'Aishwarya',
  'Pavithra', 'Nivetha', 'Subha', 'Janani', 'Keerthana', 'Tamilarasi',
  'Abinaya', 'Harini', 'Monisha', 'Pooja', 'Snega', 'Varsha', 'Yazhini',
];

const lastNames = [
  'Kumar', 'Raj', 'Krishnan', 'Murugan', 'Rajan', 'Selvam', 'Pandian',
  'Pillai', 'Nair', 'Chandra', 'Shankar', 'Mani', 'Babu', 'Natarajan',
  'Subramaniam', 'Annamalai', 'Perumal', 'Venkatesan', 'Ramachandran',
  'Palani', 'Arumugam', 'Kannan', 'Srinivasan', 'Moorthy', 'Balasubramanian',
];

function generateName(gender: Gender): string {
  const first = gender === Gender.MALE
    ? randomItem(maleFirstNames)
    : randomItem(femaleFirstNames);
  return `${first} ${randomItem(lastNames)}`;
}

// ============================================================
// AGE → DIVISION + WEIGHT CATEGORIES
// ============================================================

interface Division {
  division: string;
  ageGroup: string;
  weightsMale: string[];
  weightsFemale: string[];
}

const divisions: Division[] = [
  {
    division: 'Mini Sub Junior',
    ageGroup: '7-8 Years',
    weightsMale: ['-15kg to -20kg', '-20kg to -25kg', '-25kg to -30kg', '-30kg to -35kg', 'Above 35kg'],
    weightsFemale: ['-14kg to -18kg', '-18kg to -22kg', '-22kg to -26kg', '-26kg to -30kg', 'Above 30kg'],
  },
  {
    division: 'Mini Sub Junior',
    ageGroup: '8-9 Years',
    weightsMale: ['-25kg', '-25kg to -30kg', '-30kg to -35kg', '+35kg', '+40kg'],
    weightsFemale: ['-22kg', '-22kg to -26kg', '-26kg to -30kg', '+30kg', '+35kg'],
  },
  {
    division: 'Mini Sub Junior',
    ageGroup: '10-11 Years',
    weightsMale: ['-30kg', '-30kg to -35kg', '-35kg to -40kg', '-40kg to -45kg', 'Above 45kg'],
    weightsFemale: ['-28kg', '-28kg to -32kg', '-32kg to -36kg', '-36kg to -40kg', 'Above 40kg'],
  },
  {
    division: 'Sub Junior',
    ageGroup: '12-15 Years',
    weightsMale: ['25-30kg', '30-35kg', '35-40kg', '40-45kg', '45-50kg', '50-55kg', '55-60kg', '60-66kg', 'Above 66kg'],
    weightsFemale: ['23-28kg', '28-32kg', '32-36kg', '36-40kg', '40-44kg', '44-48kg', '48-52kg', '52-57kg', 'Above 57kg'],
  },
  {
    division: 'Cadet',
    ageGroup: '15-17 Years',
    weightsMale: ['Up to 50kg', '50-55kg', '55-60kg', '60-66kg', '66-73kg', '73-81kg', '81-90kg', 'Above 90kg'],
    weightsFemale: ['Up to 40kg', '40-44kg', '44-48kg', '48-52kg', '52-57kg', '57-63kg', '63-70kg', 'Above 70kg'],
  },
  {
    division: 'Junior',
    ageGroup: '15-21 Years',
    weightsMale: ['Up to 55kg', '55-60kg', '60-66kg', '66-73kg', '73-81kg', '81-90kg', '90-100kg', 'Above 100kg'],
    weightsFemale: ['Up to 44kg', '44-48kg', '48-52kg', '52-57kg', '57-63kg', '63-70kg', '70-78kg', 'Above 78kg'],
  },
  {
    division: 'Senior',
    ageGroup: 'Above 15 Years',
    weightsMale: ['Up to 60kg', '60-66kg', '66-73kg', '73-81kg', '81-90kg', '90-100kg', 'Above 100kg'],
    weightsFemale: ['Up to 48kg', '48-52kg', '52-57kg', '57-63kg', '63-70kg', '70-78kg', 'Above 78kg'],
  },
];

function getDivision(age: number): Division {
  if (age <= 8) return divisions[0];   // 7-8
  if (age === 9) return divisions[1];  // 8-9
  if (age <= 11) return divisions[2];  // 10-11
  if (age <= 14) return divisions[3];  // 12-15
  if (age <= 17) return divisions[4];  // 15-17 Cadet
  if (age <= 21) return divisions[5];  // 15-21 Junior
  return divisions[6];                 // Senior
}

/** Realistic weight (kg) based on age + gender, grounded in real child/youth growth data */
function realisticWeight(age: number, gender: Gender): number {
  // [min, max] in kg
  const table: Record<string, [number, number]> = {
    'MALE_6':  [16, 26], 'MALE_7':  [18, 32], 'MALE_8':  [20, 36],
    'MALE_9':  [23, 40], 'MALE_10': [26, 44], 'MALE_11': [29, 48],
    'MALE_12': [32, 54], 'MALE_13': [35, 60], 'MALE_14': [38, 65],
    'MALE_15': [42, 72], 'MALE_16': [46, 80], 'MALE_17': [50, 88],
    'MALE_18': [54, 92], 'MALE_19': [56, 96], 'MALE_20': [58, 98],
    'MALE_21': [58, 100],'MALE_22': [60, 102],'MALE_23': [60, 104],
    'MALE_24': [62, 105],
    'FEMALE_6':  [15, 24], 'FEMALE_7':  [17, 28], 'FEMALE_8':  [19, 32],
    'FEMALE_9':  [21, 36], 'FEMALE_10': [23, 40], 'FEMALE_11': [26, 44],
    'FEMALE_12': [28, 52], 'FEMALE_13': [30, 56], 'FEMALE_14': [32, 60],
    'FEMALE_15': [35, 66], 'FEMALE_16': [37, 70], 'FEMALE_17': [39, 74],
    'FEMALE_18': [40, 76], 'FEMALE_19': [42, 78], 'FEMALE_20': [42, 78],
    'FEMALE_21': [43, 79],'FEMALE_22': [44, 80], 'FEMALE_23': [44, 82],
    'FEMALE_24': [45, 83],
  };
  const key = `${gender}_${age}`;
  const [min, max] = table[key] ?? [40, 80];
  return randomInt(min, max);
}

/** Map a numeric weight to the appropriate named weight category for a division */
function weightCategory(weight: number, div: Division, gender: Gender): string {
  const cats = gender === Gender.MALE ? div.weightsMale : div.weightsFemale;

  for (const cat of cats) {
    if (matchesCat(weight, cat)) return cat;
  }
  return cats[cats.length - 1]; // fallback: last = heaviest category
}

function matchesCat(w: number, cat: string): boolean {
  // Remove leading dashes used as decoration (e.g. "-25kg to -30kg" → "25kg to 30kg")
  const norm = cat.replace(/(?<!\d)-(?=\d)/g, '').toLowerCase().trim();

  if (norm.startsWith('up to')) {
    const lim = parseInt(norm.match(/\d+/)?.[0] ?? '0');
    return w <= lim;
  }
  if (norm.startsWith('above')) {
    const lim = parseInt(norm.match(/\d+/)?.[0] ?? '9999');
    return w > lim;
  }
  if (norm.startsWith('+')) {
    const lim = parseInt(norm.match(/\d+/)?.[0] ?? '0');
    return w >= lim;
  }
  if (norm.includes('to')) {
    const nums = norm.match(/\d+/g) ?? [];
    if (nums.length >= 2) {
      return w >= parseInt(nums[0]) && w < parseInt(nums[1]);
    }
  }
  // plain single bound e.g. "-25kg" means below 25
  const num = parseInt(norm.match(/\d+/)?.[0] ?? '9999');
  return w < num;
}

function heightCm(age: number, gender: Gender): string {
  const base = gender === Gender.MALE
    ? Math.min(183, 95 + age * 4)
    : Math.min(168, 90 + age * 3.4);
  return Math.floor(base + randomInt(-4, 4)).toString();
}

function dobFromAge(age: number): Date {
  const year = 2026 - age;
  return new Date(year, randomInt(0, 11), randomInt(1, 28));
}

// ============================================================
// MAIN
// ============================================================

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
  console.log('🚀 Tamil Nadu Judo Association — Comprehensive Seed');

  console.log('\n═══════════════════════════════════════════════════════\n');

  // ── STEP 0: Clean DB ────────────────────────────────────────
  console.log('🗑️  Cleaning existing data...');
  // WARNING: Delete order matters (child tables before parent tables)
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

  // ── STEP 1: 38 Districts & Taluks ────────────────────────────
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

  // ── STEP 2: 38 Clubs (1 per district) ────────────────────
  console.log('\n🏢 Creating 38 Clubs (one per district)...');
  // Map districtId → { id, talukId } for safe lookup
  const clubByDistrict = new Map<string, { id: string; talukId: string }>();
  const clubRecs: { id: string; districtId: string }[] = [];

  for (let i = 0; i < districtRecs.length; i++) {
    const d = districtRecs[i];
    const id = uid();
    const club = await prisma.club.create({
      data: {
        name: `${d.name} Judo Club`,
        tempId: `CLUB${id}`,
        districtId: d.id,
        talukId: d.talukId,
        pincode: `6${randomInt(10000, 99999)}`,
        mobileNumber: uniqueMobile(),
        email: `club.${id}@tnja.in`,
        address1: `${randomInt(1, 200)} Main Road, ${d.name}`,
        president: generateName(Gender.MALE),
        secretary: generateName(Gender.MALE),
        coach: generateName(Gender.MALE),
        status: Status.APPROVED,
        password: 'Seed@1234',
      },
    });
    clubByDistrict.set(d.id, { id: club.id, talukId: d.talukId });
    clubRecs.push({ id: club.id, districtId: d.id });
  }
  console.log(`✅ ${clubRecs.length} Clubs created`);

  // ── STEP 3: 80 Coaches ────────────────────────────────────
  console.log('\n🥋 Creating 80 Coaches...');
  const coachRecs: { id: string }[] = [];
  const judoGrades = [
    'Black Belt 1st Dan', 'Black Belt 2nd Dan', 'Black Belt 3rd Dan',
    'Brown Belt', 'Black Belt 4th Dan',
  ];

  for (let i = 1; i <= 80; i++) {
    const distIdx = (i - 1) % districtRecs.length; // evenly spread across 38 districts
    const d = districtRecs[distIdx];
    const club = clubByDistrict.get(d.id)!;
    const gender: Gender = i <= 56 ? Gender.MALE : Gender.FEMALE; // 70% male
    const dobYear = randomInt(1970, 1992);
    const id = uid();

    const coach = await prisma.coachReferee.create({
      data: {
        tempId: `COACH${id}`,
        fullName: generateName(gender),
        fatherName: generateName(Gender.MALE),
        gender,
        dob: new Date(dobYear, randomInt(0, 11), randomInt(1, 28)),
        age: 2026 - dobYear,
        bloodGroup: randomItem(bloodGroups),
        mobileNumber: uniqueMobile(),
        email: `coach.${id}@tnja.in`,
        aadhaarNumber: uniqueAadhaar(),
        historyInJudo: `${randomInt(5, 20)} years`,
        historyInOtherMartial: 'None',
        presentGradeInJudo: randomItem(judoGrades),
        coachName: generateName(gender),
        pincode: `6${randomInt(10000, 99999)}`,
        districtId: d.id,
        talukId: d.talukId,
        clubId: club.id,
        status: Status.APPROVED,
        password: 'Seed@1234',
      },
    });
    coachRecs.push({ id: coach.id });
  }
  console.log(`✅ 80 Coaches created (spread across all 38 districts)`);

  // ── STEP 4: 40 Members ────────────────────────────────────
  console.log('\n👥 Creating 40 Members...');

  // 38 District Presidents (one per district)
  for (let i = 0; i < districtRecs.length; i++) {
    const d = districtRecs[i];
    const id = uid();
    const dobYear = randomInt(1962, 1985);
    await prisma.member.create({
      data: {
        tempId: `MEM${id}`,
        fullName: generateName(Gender.MALE),
        fatherName: generateName(Gender.MALE),
        gender: Gender.MALE,
        dob: new Date(dobYear, randomInt(0, 11), randomInt(1, 28)),
        bloodGroup: randomItem(bloodGroups),
        mobileNumber: uniqueMobile(),
        email: `dp.${id}@tnja.in`,
        aadhaarNumber: uniqueAadhaar(),
        addressLine1: `${randomInt(1, 200)} District Road`,
        city: d.name,
        addressPincode: `6${randomInt(10000, 99999)}`,
        pincode: `6${randomInt(10000, 99999)}`,
        districtId: d.id,
        talukId: d.talukId,
        role: MemberRole.DISTRICT_PRESIDENT,
        status: Status.APPROVED,
        password: 'Seed@1234',
      },
    });
  }

  // 1 State President
  {
    const d = districtRecs[2]; // Chennai
    const id = uid();
    await prisma.member.create({
      data: {
        tempId: `MEM${id}`,
        fullName: 'Ramasamy Natarajan',
        fatherName: 'Natarajan Pillai',
        gender: Gender.MALE,
        dob: new Date(1965, 5, 15),
        bloodGroup: 'O+',
        mobileNumber: uniqueMobile(),
        email: `statepres.${id}@tnja.in`,
        aadhaarNumber: uniqueAadhaar(),
        addressLine1: '1 TNJA State Headquarters, Anna Salai',
        city: 'Chennai',
        addressPincode: '600002',
        pincode: '600002',
        districtId: d.id,
        talukId: d.talukId,
        role: MemberRole.STATE_PRESIDENT,
        status: Status.APPROVED,
        password: 'Seed@1234',
      },
    });
  }

  // 1 State Secretary
  {
    const d = districtRecs[2]; // Chennai
    const id = uid();
    await prisma.member.create({
      data: {
        tempId: `MEM${id}`,
        fullName: 'Venkatesan Subramaniam',
        fatherName: 'Subramaniam Pillai',
        gender: Gender.MALE,
        dob: new Date(1970, 3, 22),
        bloodGroup: 'B+',
        mobileNumber: uniqueMobile(),
        email: `statesec.${id}@tnja.in`,
        aadhaarNumber: uniqueAadhaar(),
        addressLine1: '2 TNJA State Headquarters, Anna Salai',
        city: 'Chennai',
        addressPincode: '600002',
        pincode: '600002',
        districtId: d.id,
        talukId: d.talukId,
        role: MemberRole.STATE_SECRETARY,
        status: Status.APPROVED,
        password: 'Seed@1234',
      },
    });
  }

  console.log(`✅ 40 Members created (38 District Presidents + 1 State President + 1 State Secretary)`);

  // ── STEP 5: 1000 Students ─────────────────────────────────
  console.log('\n🎓 Creating 1000 Students...');

  interface StudentRecord {
    id: string;
    name: string;
    clubId: string;
    gender: Gender;
    dob: Date;
    age: number;
    weightKg: number;
    division: Division;
  }

  const studentRecs: StudentRecord[] = [];

  for (let i = 1; i <= 1000; i++) {
    const gender: Gender = i % 2 === 0 ? Gender.MALE : Gender.FEMALE; // exact 500/500 split
    const age = randomInt(6, 24);
    const weightKg = realisticWeight(age, gender);
    const dob = dobFromAge(age);
    const division = getDivision(age);
    const height = heightCm(age, gender);

    const distIdx = (i - 1) % districtRecs.length; // spread across all 38 districts
    const d = districtRecs[distIdx];
    const club = clubByDistrict.get(d.id)!;
    const coach = coachRecs[(i - 1) % coachRecs.length];

    const id = uid();
    const isSchool = age < 18;
    const schoolName = isSchool
      ? `${d.name} Government Higher Secondary School`
      : `${d.name} Arts and Science College`;
    const grade = isSchool
      ? `Grade ${Math.max(1, age - 5)}`
      : `Year ${Math.min(4, age - 17)}`;

    const student = await prisma.student.create({
      data: {
        tempId: `STU${id}`,
        fullName: generateName(gender),
        gender,
        dob,
        age,
        weight: weightKg.toString(),
        height,
        bloodGroup: randomItem(bloodGroups),
        mobileNumber: uniqueMobile(),
        email: `stu.${id}@tnja.in`,
        aadhaarNumber: uniqueAadhaar(),
        address: `${randomInt(1, 300)} ${d.name} Main Street`,
        city: d.name,
        state: 'Tamil Nadu',
        addressPincode: `6${randomInt(10000, 99999)}`,
        pincode: `6${randomInt(10000, 99999)}`,
        nationality: 'Indian',
        annualIncome: randomInt(50000, 800000),
        institutionType: isSchool ? 'SCHOOL' : 'COLLEGE',
        schoolName,
        grade,
        districtId: d.id,
        talukId: d.talukId,
        clubId: club.id,
        coachId: coach.id,
        status: Status.APPROVED,
        password: 'Seed@1234',
      },
    });

    studentRecs.push({
      id: student.id,
      name: student.fullName,
      clubId: club.id,
      gender,
      dob,
      age,
      weightKg,
      division,
    });

    if (i % 100 === 0) process.stdout.write(`   → ${i}/1000 students\n`);
  }
  console.log(`✅ 1000 Students created (500 Male / 500 Female, ages 6–24)`);

  // ── STEP 6: Tournament ────────────────────────────────────
  console.log('\n🏆 Creating Tournament...');
  const tournament = await prisma.tournament.create({
    data: {
      title: 'Tamil Nadu State Judo Championship 2026',
      date: new Date('2026-08-15'),
      dateTo: new Date('2026-08-17'),
      level: EventLevel.STATE,
      status: Status.APPROVED,
      location: 'Nehru Indoor Stadium, Chennai',
      description:
        'Annual Tamil Nadu State Level Judo Championship 2026 — open to all registered students from across Tamil Nadu. Conducted under the auspices of the Tamil Nadu Judo Association.',
      gender: 'BOTH',
      ageFrom: 6,
      ageTo: 24,
      numberOfMats: 6,
      registrationClosed: false,
      districtApproval: Status.APPROVED,
      stateApproval: Status.APPROVED,
      superAdminApproval: Status.APPROVED,
      ceoApproval: Status.APPROVED,
    },
  });
  console.log(`✅ Tournament: "${tournament.title}"`);

  // ── STEP 7: Register all 1000 students ───────────────────
  console.log('\n📋 Registering 1000 students to tournament...');
  for (let i = 0; i < studentRecs.length; i++) {
    const s = studentRecs[i];
    const coach = coachRecs[i % coachRecs.length];
    const ageGroup = getAgeGroup(s.dob);
    const weightCategory = getWeightCategory(s.weightKg, s.gender, ageGroup) || "ALL";

    await prisma.tournamentRegistration.create({
      data: {
        tournamentId: tournament.id,
        playerId: s.id,
        coachId: coach.id,
        status: Status.APPROVED,
        weight: s.weightKg.toString(),
        height: heightCm(s.age, s.gender),
        ageGroup,
        weightCategory,
      },
    });
    if ((i + 1) % 100 === 0) process.stdout.write(`   → ${i + 1}/1000 registrations\n`);
  }
  console.log(`✅ 1000 Tournament Registrations created`);

  // ── STEP 8: Group students → bracket draws ────────────────
  console.log('\n🎯 Generating Tournament Bracket Draws...');

  // Build groups: { "Division__AgeGroup__GENDER__WeightCat" → [students] }
  const groups = new Map<string, { studentId: string; name: string; clubId: string }[]>();

  for (const s of studentRecs) {
    const ageGroup = getAgeGroup(s.dob);
    const wCat = getWeightCategory(s.weightKg, s.gender, ageGroup) || "ALL";
    const key = `${ageGroup}__0__${s.gender}__${wCat}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ studentId: s.id, name: s.name, clubId: s.clubId });
  }

  let totalDraws = 0;
  let totalMatches = 0;
  let matchCounter = 0;

  for (const [key, players] of groups.entries()) {
    if (players.length < 2) continue; // skip singleton groups

    const parts = key.split('__');
    const divisionName = parts[0];
    const ageGroup = parts[1];
    const gender = parts[2];
    const wCat = parts[3];

    const round1: any[] = [];

    for (let i = 0; i < players.length - 1; i += 2) {
      matchCounter++;
      const p1 = players[i];
      const p2 = players[i + 1];
      round1.push({
        matchId: `M${matchCounter}_R1`,
        round: 1,
        matchNumber: Math.floor(i / 2) + 1,
        matNumber: ((totalDraws % 6) + 1),
        slotA: { playerId: p1.studentId, playerName: p1.name, club: p1.clubId, isBye: false },
        slotB: { playerId: p2.studentId, playerName: p2.name, club: p2.clubId, isBye: false },
        winnerId: null,
        status: 'PENDING',
      });
      totalMatches++;
    }

    // Odd player out → BYE entry
    if (players.length % 2 !== 0) {
      matchCounter++;
      const bye = players[players.length - 1];
      round1.push({
        matchId: `M${matchCounter}_R1_BYE`,
        round: 1,
        matchNumber: Math.floor(players.length / 2) + 1,
        matNumber: ((totalDraws % 6) + 1),
        slotA: { playerId: bye.studentId, playerName: bye.name, club: bye.clubId, isBye: false },
        slotB: { playerId: null, playerName: 'BYE', club: '', isBye: true },
        winnerId: bye.studentId,
        status: 'COMPLETED',
      });
    }

    await prisma.tournamentDraw.create({
      data: {
        tournamentId: tournament.id,
        ageGroup: divisionName,
        gender,
        weightCategory: wCat,
        rounds: [round1],
      },
    });

    totalDraws++;
  }

  console.log(`✅ ${totalDraws} Bracket Draws created`);
  console.log(`✅ ${totalMatches} Matches generated`);

  // ── FINAL SUMMARY ─────────────────────────────────────────
  console.log('\n' + '═'.repeat(55));
  console.log('              SEED COMPLETE — SUMMARY              ');
  console.log('═'.repeat(55));
  console.log(`  ✅ Tamil Nadu Districts      : ${districtRecs.length}`);
  console.log(`  ✅ Clubs (1 per district)    : ${clubRecs.length}`);
  console.log(`  ✅ Coaches                   : 80`);
  console.log(`  ✅ Members                   : 40`);
  console.log(`       └─ 38 District Presidents`);
  console.log(`       └─  1 State President`);
  console.log(`       └─  1 State Secretary`);
  console.log(`  ✅ Students                  : 1000`);
  console.log(`       └─ 500 Male / 500 Female`);
  console.log(`       └─ Ages 6–24`);
  console.log(`       └─ Realistic weights per age/gender`);
  console.log(`  ✅ Tournament                : 1`);
  console.log(`  ✅ Registrations             : 1000`);
  console.log(`  ✅ Bracket Draws             : ${totalDraws}`);
  console.log(`  ✅ Matches in Brackets       : ${totalMatches}`);
  console.log('═'.repeat(55));
  console.log('\n  🔑 Default password for all: Seed@1234\n');
}

main()
  .catch((e) => {
    console.error('\n❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });