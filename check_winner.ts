import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tournaments = await prisma.tournament.findMany({
    where: { status: 'CLOSED' },
    include: {
      registrations: {
        include: {
          player: true
        }
      }
    }
  });

  for (const t of tournaments) {
    console.log(`\nTournament: ${t.title} (ID: ${t.id})`);
    for (const r of t.registrations) {
      console.log(`- Player: ${r.player?.fullName || r.playerName} (ID: ${r.playerId})`);
      console.log(`  Placement: ${r.placement}`);
      console.log(`  Registration Status: ${r.status}`);
      console.log(`  Paid: ${r.isPaid}`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
