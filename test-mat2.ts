import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  try {
    const t = await prisma.tournament.findFirst()
    const r = await prisma.coachReferee.findFirst()
    if (!r) {
      console.log("No referee found")
      return
    }
    await prisma.tournamentMat.create({
      data: {
        tournamentId: t!.id,
        matNumber: 100,
        refereeId: r.id
      }
    })
    console.log("Success with valid referee:", r.id)
  } catch (e: any) {
    console.log("Error:", e.message)
  }
}
main()
