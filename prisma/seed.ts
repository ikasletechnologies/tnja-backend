import { PrismaClient, EventLevel, Status, Gender } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

const prefix = Math.floor(10000 + Math.random() * 90000).toString(); // 5 digits
let uniqueCounter = 1;

function getUniqueId() {
    uniqueCounter++;
    return `${prefix}${uniqueCounter.toString().padStart(4, '0')}`; // 9 digits
}

const districtsList = [
    'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri', 'Dindigul', 'Erode',
    'Kallakurichi', 'Kancheepuram', 'Kanniyakumari', 'Karur', 'Krishnagiri', 'Madurai', 'Mayiladuthurai',
    'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet',
    'Salem', 'Sivagangai', 'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli',
    'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore', 'Viluppuram', 'Virudhunagar'
];

const categoriesData = [
    {
        division: 'Mini Sub Junior',
        ageGroup: '7-8 Years',
        birthYears: [2018, 2019],
        genders: {
            MALE: ['-15kg to -20kg', '-20kg to -25kg', '-25kg to -30kg', '-30kg to -35kg', 'Above 35kg'],
            FEMALE: ['-14kg to -18kg', '-18kg to -22kg', '-22kg to -26kg', '-26kg to -30kg', 'Above 30kg']
        }
    },
    {
        division: 'Mini Sub Junior',
        ageGroup: '8-9 Years',
        birthYears: [2017, 2018],
        genders: {
            MALE: ['-25kg', '-25kg to -30kg', '-30kg to -35kg', '+35kg', '+40kg'],
            FEMALE: ['-22kg', '-22kg to -26kg', '-26kg to -30kg', '+30kg', '+35kg']
        }
    },
    {
        division: 'Mini Sub Junior',
        ageGroup: '10-11 Years',
        birthYears: [2015, 2016],
        genders: {
            MALE: ['-30kg', '-30kg to -35kg', '-35kg to -40kg', '-40kg to -45kg', 'Above 45kg'],
            FEMALE: ['-28kg', '-28kg to -32kg', '-32kg to -36kg', '-36kg to -40kg', 'Above 40kg']
        }
    },
    {
        division: 'Sub Junior',
        ageGroup: '12-15 Years',
        birthYears: [2011, 2012, 2013],
        genders: {
            MALE: ['25-30kg', '30-35kg', '35-40kg', '40-45kg', '45-50kg', '50-55kg', '55-60kg', '60-66kg', 'Above 66kg'],
            FEMALE: ['23-28kg', '28-32kg', '32-36kg', '36-40kg', '40-44kg', '44-48kg', '48-52kg', '52-57kg', 'Above 57kg']
        }
    },
    {
        division: 'Cadet',
        ageGroup: '15-17 Years',
        birthYears: [2008, 2009, 2010],
        genders: {
            MALE: ['Up to 50kg', '50-55kg', '55-60kg', '60-66kg', '66-73kg', '73-81kg', '81-90kg', 'Above 90kg'],
            FEMALE: ['Up to 40kg', '40-44kg', '44-48kg', '48-52kg', '52-57kg', '57-63kg', '63-70kg', 'Above 70kg']
        }
    },
    {
        division: 'Junior',
        ageGroup: '15-21 Years',
        birthYears: [2005, 2006, 2007, 2008, 2009, 2010],
        genders: {
            MALE: ['Up to 55kg', '55-60kg', '60-66kg', '66-73kg', '73-81kg', '81-90kg', '90-100kg', 'Above 100kg'],
            FEMALE: ['Up to 44kg', '44-48kg', '48-52kg', '52-57kg', '57-63kg', '63-70kg', '70-78kg', 'Above 78kg']
        }
    },
    {
        division: 'Senior',
        ageGroup: 'Above 15 Years',
        birthYears: [2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010],
        genders: {
            MALE: ['Up to 60kg', '60-66kg', '66-73kg', '73-81kg', '81-90kg', '90-100kg', 'Above 100kg'],
            FEMALE: ['Up to 48kg', '48-52kg', '52-57kg', '57-63kg', '63-70kg', '70-78kg', 'Above 78kg']
        }
    }
];

function generateWeight(weightCategory: string): string {
    const match = weightCategory.match(/\d+/g);
    if (!match) return "50";
    if (match.length >= 2) {
        const w1 = parseInt(match[0]);
        const w2 = parseInt(match[1]);
        return Math.floor((w1 + w2) / 2).toString();
    } else {
        if (weightCategory.includes('Above') || weightCategory.includes('+')) {
            return (parseInt(match[0]) + 5).toString();
        } else {
            return (parseInt(match[0]) - 2).toString();
        }
    }
}

function generateDOB(birthYears: number[]): Date {
    const year = birthYears[Math.floor(Math.random() * birthYears.length)];
    const month = Math.floor(Math.random() * 12);
    const day = Math.floor(Math.random() * 28) + 1;
    return new Date(year, month, day);
}

function randomItem<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
    console.log("Starting Seed Process...");

    // 1. Create Tournaments
    console.log("Creating Tournaments...");
    const t1 = await prisma.tournament.create({
        data: {
            title: 'Testing1 Tournament 07-07-2026',
            date: new Date('2026-07-07'),
            level: EventLevel.STATE,
            status: Status.PENDING,
            location: 'Chennai',
            description: 'Testing1 Tournament',
            gender: 'BOTH',
        }
    });

    const t2 = await prisma.tournament.create({
        data: {
            title: 'Testing2 Tournament 07-07-2026',
            date: new Date('2026-07-07'),
            level: EventLevel.STATE,
            status: Status.PENDING,
            location: 'Chennai',
            description: 'Testing2 Tournament',
            gender: 'BOTH',
        }
    });
    console.log(`✅ 2 Tournaments Created`);

    // 2. Create Districts and Taluks
    console.log("Creating Districts...");
    const districtIds: Record<string, string> = {};
    const talukIds: Record<string, string> = {};
    const districtRecords = [];

    for (const name of districtsList) {
        const district = await prisma.district.create({
            data: {
                name: `${name} ${getUniqueId()}`,
                taluks: {
                    create: [
                        { name: `${name} Taluk`, pincode: '600000' }
                    ]
                }
            },
            include: { taluks: true }
        });
        districtRecords.push(district);
        districtIds[name] = district.id;
        talukIds[name] = district.taluks[0].id;
    }
    console.log(`✅ ${districtsList.length} Districts Created`);

    // 3. Create Clubs
    console.log("Creating Clubs...");
    const clubRecords = [];
    for (const name of districtsList) {
        const club = await prisma.club.create({
            data: {
                name: `${name} Judo Club`,
                tempId: `CLUB${getUniqueId()}`,
                districtId: districtIds[name],
                talukId: talukIds[name],
                pincode: '600000',
                mobileNumber: `9${getUniqueId()}`,
                email: `club_${getUniqueId()}@test.com`,
                address1: '123 Main St',
                president: 'President Name',
                secretary: 'Secretary Name',
                coach: 'Coach Name',
                status: Status.APPROVED,
            }
        });
        clubRecords.push(club);
    }
    console.log(`✅ ${clubRecords.length} Clubs Created`);

    // 4. Create Referees
    console.log("Creating Referees...");
    const refereeRecords = [];
    for (let i = 1; i <= 80; i++) {
        const district = randomItem(districtRecords);
        const club = randomItem(clubRecords);
        const ref = await prisma.coachReferee.create({
            data: {
                tempId: `REF${getUniqueId()}`,
                fullName: `Referee ${i} ${getUniqueId()}`,
                fatherName: 'Father',
                gender: Gender.MALE,
                dob: new Date('1980-01-01'),
                age: 46,
                bloodGroup: 'O+',
                mobileNumber: `8${getUniqueId()}`,
                email: `referee_${getUniqueId()}@test.com`,
                aadhaarNumber: `123${getUniqueId()}`,
                historyInJudo: '10 years',
                historyInOtherMartial: 'None',
                presentGradeInJudo: 'Black Belt',
                pincode: '600000',
                districtId: district.id,
                talukId: district.taluks[0].id,
                clubId: club.id,
                status: Status.APPROVED,
                password: 'password123',
            }
        });
        refereeRecords.push(ref);
    }
    console.log(`✅ 80 Referees Created`);

    // 5. Create Players, Registrations and categorize them for Matches
    console.log("Creating Players & Registrations...");
    const matchGroups: Record<string, { t1: any[], t2: any[] }> = {};

    let totalPlayers = 0;
    let totalCategories = 0;
    let totalWeightCategories = 0;

    for (const cat of categoriesData) {
        totalCategories++;
        for (const [genderStr, weights] of Object.entries(cat.genders)) {
            const gender = genderStr as Gender;
            for (const weightCat of weights) {
                totalWeightCategories++;
                
                const groupKey = `${cat.division}_${cat.ageGroup}_${gender}_${weightCat}`;
                matchGroups[groupKey] = { t1: [], t2: [] };

                const playersToCreate = Array.from({ length: 12 }).map((_, i) => {
                    const dob = generateDOB(cat.birthYears);
                    const age = 2026 - dob.getFullYear();
                    const weight = generateWeight(weightCat);
                    const club = randomItem(clubRecords);
                    const districtName = districtsList.find(d => club.name.includes(d)) || districtsList[0];
                    const uid = getUniqueId();
                    
                    return {
                        tempId: `STU${uid}`,
                        districtId: districtIds[districtName],
                        talukId: talukIds[districtName],
                        clubId: club.id,
                        fullName: `Member ${uid}`,
                        gender: gender,
                        dob: dob,
                        age: age,
                        weight: weightCat,
                        height: '150',
                        bloodGroup: 'O+',
                        mobileNumber: `7${uid}`,
                        email: `player_${uid}@test.com`,
                        aadhaarNumber: `123${uid}`,
                        address: 'Player Address',
                        city: 'City',
                        state: 'Tamil Nadu',
                        addressPincode: '600000',
                        pincode: '600000',
                        nationality: 'Indian',
                        annualIncome: 100000,
                        schoolName: 'School',
                        grade: '10',
                        password: 'password123',
                        status: Status.APPROVED,
                    };
                });

                await prisma.student.createMany({ data: playersToCreate });
                totalPlayers += playersToCreate.length;

                // Fetch created to get IDs
                const createdPlayers = await prisma.student.findMany({
                    where: { tempId: { in: playersToCreate.map(p => p.tempId) } }
                });

                // Register 50% to T1, 50% to T2
                for (let i = 0; i < createdPlayers.length; i++) {
                    const targetTournament = i % 2 === 0 ? t1.id : t2.id;
                    const registration = await prisma.tournamentRegistration.create({
                        data: {
                            tournamentId: targetTournament,
                            playerId: createdPlayers[i].id,
                            status: Status.APPROVED,
                            weight: createdPlayers[i].weight,
                            height: createdPlayers[i].height,
                        }
                    });
                    
                    if (targetTournament === t1.id) {
                        matchGroups[groupKey].t1.push(registration);
                    } else {
                        matchGroups[groupKey].t2.push(registration);
                    }
                }
            }
        }
    }
    
    console.log(`✅ ${totalCategories} Categories Created`);
    console.log(`✅ ${totalWeightCategories} Weight Categories Created`);
    console.log(`✅ ${totalPlayers} Players Created`);
    console.log(`✅ ${totalPlayers} Tournament Registrations Created`);

    // 6. Generate Matches (TournamentDraw)
    console.log("Generating Matches...");
    let totalMatchesCreated = 0;

    for (const cat of categoriesData) {
        for (const [genderStr, weights] of Object.entries(cat.genders)) {
            for (const weightCat of weights) {
                const groupKey = `${cat.division}_${cat.ageGroup}_${genderStr}_${weightCat}`;
                const group = matchGroups[groupKey];

                const createDraw = async (tournamentId: string, regs: any[]) => {
                    if (regs.length === 0) return;

                    const playerIds = regs.map(r => r.playerId);
                    const playersData = await prisma.student.findMany({
                        where: { id: { in: playerIds } },
                        select: { id: true, fullName: true, clubId: true }
                    });
                    
                    const actualMatches = [];
                    for (let i = 0; i < regs.length; i += 2) {
                        if (i + 1 < regs.length) {
                            const p1 = playersData.find(p => p.id === regs[i].playerId);
                            const p2 = playersData.find(p => p.id === regs[i+1].playerId);
                            
                            actualMatches.push({
                                matchId: `M_1_${Math.floor(i/2) + 1}_${Date.now()}`,
                                round: 1,
                                matchNumber: Math.floor(i/2) + 1,
                                matNumber: 1,
                                slotA: {
                                    playerId: p1?.id || null,
                                    playerName: p1?.fullName || "TBD",
                                    club: p1?.clubId || "",
                                    isBye: false
                                },
                                slotB: {
                                    playerId: p2?.id || null,
                                    playerName: p2?.fullName || "TBD",
                                    club: p2?.clubId || "",
                                    isBye: false
                                },
                                winnerId: null,
                                status: "PENDING"
                            });
                            totalMatchesCreated++;
                        }
                    }

                    const roundsData = [ actualMatches ];

                    await prisma.tournamentDraw.create({
                        data: {
                            tournamentId: tournamentId,
                            ageGroup: `${cat.division} ${cat.ageGroup}`,
                            gender: genderStr,
                            weightCategory: weightCat,
                            rounds: roundsData,
                        }
                    });
                };

                await createDraw(t1.id, group.t1);
                await createDraw(t2.id, group.t2);
            }
        }
    }

    console.log(`✅ ${totalMatchesCreated} Matches Created`);

    console.log("\n==========================================================");
    console.log("SEED SUMMARY");
    console.log("==========================================================");
    console.log(`✅ Tournaments Created: 2`);
    console.log(`✅ Districts Created: ${districtsList.length}`);
    console.log(`✅ Clubs Created: ${clubRecords.length}`);
    console.log(`✅ Referees Created: ${refereeRecords.length}`);
    console.log(`✅ Categories Created: ${totalCategories}`);
    console.log(`✅ Weight Categories Created: ${totalWeightCategories}`);
    console.log(`✅ Players Created: ${totalPlayers}`);
    console.log(`✅ Tournament Registrations Created: ${totalPlayers}`);
    console.log(`✅ Matches Created: ${totalMatchesCreated}`);
    console.log("==========================================================");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });