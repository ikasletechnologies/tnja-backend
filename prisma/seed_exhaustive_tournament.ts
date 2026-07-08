import { PrismaClient, EventLevel, Status, Gender } from '@prisma/client';

const prisma = new PrismaClient();

let _seq = 5000;
function nextSeq(): number {
  return _seq++;
}
function uniqueMobile(): string {
  return `9${nextSeq().toString().padStart(9, '0')}`;
}
function uniqueAadhaar(): string {
  return `2${nextSeq().toString().padStart(11, '0')}`;
}
function uid(): string {
  return nextSeq().toString().padStart(7, '0');
}

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

function getDummyAge(ageGroup: string): number {
  if (ageGroup === '7-8 Years') return 8;
  if (ageGroup === '8-9 Years') return 9;
  if (ageGroup === '10-11 Years') return 11;
  if (ageGroup === '12-15 Years') return 14;
  if (ageGroup === '15-17 Years') return 16;
  if (ageGroup === '15-21 Years') return 19;
  if (ageGroup === 'Above 15 Years') return 25;
  return 20;
}

function getDummyWeight(weightStr: string): number {
  // Extract numbers to get a valid weight for the category
  const nums = weightStr.match(/\d+/g);
  if (nums && nums.length > 0) {
    if (weightStr.includes('to') || weightStr.includes('-')) {
      return Number(nums[0]) + 1; // E.g. "25-30kg" -> 26
    }
    if (weightStr.includes('Above') || weightStr.includes('+')) {
      return Number(nums[0]) + 5; // E.g. "+35kg" -> 40
    }
    if (weightStr.includes('Up to')) {
      return Number(nums[0]) - 2; // E.g. "Up to 50kg" -> 48
    }
    return Number(nums[0]);
  }
  return 50;
}

async function main() {
  console.log('--- Seeding Exhaustive Tournament ---');

  // Fetch a district, taluk, club, coach to link players to
  const district = await prisma.district.findFirst();
  const taluk = await prisma.taluk.findFirst();
  const club = await prisma.club.findFirst();
  const coach = await prisma.coachReferee.findFirst();
  
  if (!district || !taluk || !club || !coach) {
    console.error("Missing required base data (district, taluk, club, coach). Run standard seed first.");
    return;
  }

  // Create the tournament
  console.log('Creating Exhaustive Tournament...');
  const tournament = await prisma.tournament.create({
    data: {
      title: `All-Categories Testing Championship ${Date.now()}`,
      date: new Date('2026-09-01'),
      dateTo: new Date('2026-09-03'),
      level: EventLevel.STATE,
      status: Status.APPROVED,
      location: 'Test Arena, Chennai',
      description: 'A test tournament with players registered across EVERY SINGLE age and weight category.',
      gender: 'BOTH',
      clubId: club.id,
    },
  });
  console.log(`✅ Tournament Created: ${tournament.title} (ID: ${tournament.id})`);

  let studentCount = 0;
  let registrationCount = 0;

  for (const div of divisions) {
    const age = getDummyAge(div.ageGroup);
    
    // Generate Male Players
    for (const wCat of div.weightsMale) {
      const weight = getDummyWeight(wCat);
      for (let i = 1; i <= 4; i++) {
        const student = await prisma.student.create({
          data: {
            tempId: `STU${uid()}`,
            permanentId: `PERM${uid()}`,
            fullName: `M ${i} ${wCat.replace(/ /g, '')}`,
            gender: Gender.MALE,
            dob: new Date(new Date().getFullYear() - age, 0, 1),
            age: age,
            bloodGroup: 'O+',
            mobileNumber: uniqueMobile(),
            aadhaarNumber: uniqueAadhaar(),
            address: 'Test Address',
            pincode: '600001',
            districtId: district.id,
            talukId: taluk.id,
            clubId: club.id,
            weight: weight.toString(), 
            height: '150', 
            status: Status.APPROVED,
            email: `mplayer${i}${Date.now()}@test.com`,
            city: 'Chennai',
            state: 'Tamil Nadu',
            addressPincode: '600001',
            nationality: 'Indian',
            annualIncome: 100000,
            schoolName: 'Test School',
            grade: '10th',
            password: 'dummy',
          }
        });
        studentCount++;

        // Register to Tournament
        await prisma.tournamentRegistration.create({
          data: {
            tournamentId: tournament.id,
            playerId: student.id,
            coachId: coach.id,
            status: Status.APPROVED,
            weight: weight.toString(), 
          }
        });
        registrationCount++;
      }
    }

    // Generate Female Players
    for (const wCat of div.weightsFemale) {
      const weight = getDummyWeight(wCat);
      for (let i = 1; i <= 4; i++) {
        const student = await prisma.student.create({
          data: {
            tempId: `STU${uid()}`,
            permanentId: `PERM${uid()}`,
            fullName: `F ${i} ${wCat.replace(/ /g, '')}`,
            gender: Gender.FEMALE,
            dob: new Date(new Date().getFullYear() - age, 0, 1),
            age: age,
            bloodGroup: 'O+',
            mobileNumber: uniqueMobile(),
            aadhaarNumber: uniqueAadhaar(),
            address: 'Test Address',
            pincode: '600001',
            districtId: district.id,
            talukId: taluk.id,
            clubId: club.id,
            weight: weight.toString(), 
            height: '150',
            status: Status.APPROVED,
            email: `fplayer${i}${Date.now()}@test.com`,
            city: 'Chennai',
            state: 'Tamil Nadu',
            addressPincode: '600001',
            nationality: 'Indian',
            annualIncome: 100000,
            schoolName: 'Test School',
            grade: '10th',
            password: 'dummy',
          }
        });
        studentCount++;

        await prisma.tournamentRegistration.create({
          data: {
            tournamentId: tournament.id,
            playerId: student.id,
            coachId: coach.id,
            status: Status.APPROVED,
            weight: weight.toString(),
          }
        });
        registrationCount++;
      }
    }
  }

  console.log(`✅ Created ${studentCount} Students.`);
  console.log(`✅ Created ${registrationCount} Registrations.`);
  console.log(`\n🎉 Seed complete! You can view the tournament at: /dashboard/admin/tournaments/${tournament.id}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
