import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Fixing TournamentDraw data...");
    const draws = await prisma.tournamentDraw.findMany();
    let updatedCount = 0;

    for (const draw of draws) {
        if (!draw.rounds || !Array.isArray(draw.rounds)) continue;
        
        let needsFix = false;
        const newRounds = [];

        for (const round of draw.rounds as any[]) {
            if (!Array.isArray(round)) {
                needsFix = true;
                // If it's the bad object format { round: 1, matches: [] }
                if (round.matches && Array.isArray(round.matches)) {
                    const mappedMatches = round.matches.map((m: any, idx: number) => {
                        // The old format had id, player1, player2, winner, referee
                        return {
                            matchId: m.id || `M_1_${idx + 1}_${Date.now()}`,
                            round: round.round || 1,
                            matchNumber: idx + 1,
                            matNumber: 1,
                            slotA: {
                                playerId: m.player1 || null,
                                playerName: m.player1 ? "Player" : "TBD",
                                club: "",
                                isBye: false
                            },
                            slotB: {
                                playerId: m.player2 || null,
                                playerName: m.player2 ? "Player" : "TBD",
                                club: "",
                                isBye: false
                            },
                            winnerId: m.winner || null,
                            status: "PENDING"
                        };
                    });
                    newRounds.push(mappedMatches);
                } else {
                    newRounds.push([]);
                }
            } else {
                newRounds.push(round);
            }
        }

        if (needsFix) {
            await prisma.tournamentDraw.update({
                where: { id: draw.id },
                data: { rounds: newRounds }
            });
            updatedCount++;
        }
    }

    console.log(`✅ Fixed ${updatedCount} TournamentDraw records.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
