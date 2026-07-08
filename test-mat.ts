import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  try {
    const t = await prisma.tournament.findFirst()
    await prisma.tournamentMat.create({
      data: {
        tournamentId: t!.id,
        matNumber: 99,
        refereeId: null
      }
    })
    console.log("Success with null")
  } catch (e: any) {
    console.log("Error:", e.message)
  }
}
main()
