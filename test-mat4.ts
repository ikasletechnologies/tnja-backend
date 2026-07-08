import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  try {
    const t = await prisma.tournament.findFirst()
    await prisma.tournamentMat.createMany({
      data: [
        {
          tournamentId: t!.id,
          matNumber: 201,
          refereeId: null
        }
      ]
    })
    console.log("Success createMany with null")
  } catch (e: any) {
    console.log("Error:", e.message)
  }
}
main()
