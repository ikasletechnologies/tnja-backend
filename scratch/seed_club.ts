import prisma from "../src/lib/prisma.js";

async function main() {
  try {
    const club = await prisma.club.create({
      data: {
        name: "Tamil Nadu Judo Academy",
        district: "Chennai",
        taluk: "Mylapore",
        pincode: "600004",
        mobileNumber: "9876543210",
        email: "tnja@example.com",
        address1: "123 Judo Street",
        president: "Mr. President",
        secretary: "Mr. Secretary",
        coach: "Head Coach",
        noOfStudents: 50,
        maleStudents: 30,
        femaleStudents: 20
      }
    });
    console.log("Created Club:", JSON.stringify(club, null, 2));
  } catch (error) {
    console.error("Error seeding club:", error);
  } finally {
    process.exit(0);
  }
}

main();
