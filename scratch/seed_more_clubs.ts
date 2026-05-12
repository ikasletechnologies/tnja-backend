import prisma from "../src/lib/prisma.js";

async function main() {
  const clubsData = [
    {
      name: "Chennai Judo Club",
      districtName: "Chennai",
      talukName: "Adyar",
      pincode: "600020",
      mobileNumber: "9876543211",
      email: "chennaijudo@example.com",
      address1: "45 Adyar Main Road",
      president: "Mr. Chennai",
      secretary: "Mr. Adyar",
      coach: "Adyar Coach",
      noOfStudents: 40,
      maleStudents: 25,
      femaleStudents: 15
    },
    {
      name: "Madurai Martial Arts",
      districtName: "Madurai",
      talukName: "Madurai North",
      pincode: "625001",
      mobileNumber: "9876543212",
      email: "maduraimartial@example.com",
      address1: "10 Temple Street",
      president: "Mr. Madurai",
      secretary: "Mr. North",
      coach: "Madurai Coach",
      noOfStudents: 60,
      maleStudents: 40,
      femaleStudents: 20
    }
  ];

  try {
    for (const data of clubsData) {
      const district = await prisma.district.findUnique({
        where: { name: data.districtName }
      });

      if (!district) {
        console.error(`District not found: ${data.districtName}`);
        continue;
      }

      const taluk = await prisma.taluk.findFirst({
        where: { name: data.talukName, districtId: district.id }
      });

      if (!taluk) {
          console.error(`Taluk not found: ${data.talukName} in ${data.districtName}`);
          continue;
      }

      const { districtName, talukName, ...clubInfo } = data;

      const club = await prisma.club.create({
        data: {
          ...clubInfo,
          districtId: district.id,
          talukId: taluk.id
        }
      });
      console.log("Created Club:", club.name);
    }
  } catch (error) {
    console.error("Error seeding more clubs:", error);
  } finally {
    process.exit(0);
  }
}

main();
