import prisma from "../src/lib/prisma.js";

async function main() {
  try {
    const students = await prisma.student.count();
    const coaches = await prisma.coachReferee.count();
    const clubs = await prisma.club.count();
    const members = await prisma.member.count();
    
    console.log("Supabase DB counts:");
    console.log("Students:", students);
    console.log("Coaches:", coaches);
    console.log("Clubs:", clubs);
    console.log("Members:", members);
  } catch (error) {
    console.error("Error connecting to database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
