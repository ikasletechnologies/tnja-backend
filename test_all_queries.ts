import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const resCoach = await prisma.coachReferee.findMany({
      where: {
        OR: [
          { fullName: { contains: 'test', mode: 'insensitive' } },
          { email: { contains: 'test', mode: 'insensitive' } },
          { mobileNumber: { contains: 'test' } },
          { tempId: { contains: 'test', mode: 'insensitive' } },
          { permanentId: { contains: 'test', mode: 'insensitive' } }
        ]
      }
    });
    console.log('coach success', resCoach.length);

    const resMember = await prisma.member.findMany({
      where: {
        OR: [
          { fullName: { contains: 'test', mode: 'insensitive' } },
          { email: { contains: 'test', mode: 'insensitive' } },
          { mobileNumber: { contains: 'test' } },
          { tempId: { contains: 'test', mode: 'insensitive' } },
          { permanentId: { contains: 'test', mode: 'insensitive' } }
        ]
      }
    });
    console.log('member success', resMember.length);

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
