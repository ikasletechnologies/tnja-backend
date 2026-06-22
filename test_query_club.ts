import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const res = await prisma.club.findMany({
      where: {
        OR: [
          { name: { contains: 'test', mode: 'insensitive' } },
          { email: { contains: 'test', mode: 'insensitive' } },
          { mobileNumber: { contains: 'test' } },
          { tempId: { contains: 'test', mode: 'insensitive' } },
          { permanentId: { contains: 'test', mode: 'insensitive' } }
        ]
      }
    });
    console.log('success', res.length);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
