import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  try {
    const t = await prisma.tournament.findFirst()
    await prisma.tournamentMat.create({
      data: {
        tournamentId: t!.id,
        matNumber: 101,
        refereeId: ""
      }
    })
    console.log("Success with empty string")
  } catch (e: any) {
    console.log("Error:", e.message)
  }
}
main()
