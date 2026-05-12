import prisma from "../src/lib/prisma.js";

const tnLocations = [
  {
    name: "Chennai",
    taluks: [
      { name: "Mylapore", pincode: "600004" },
      { name: "Adyar", pincode: "600020" },
      { name: "T. Nagar", pincode: "600017" },
      { name: "Ambattur", pincode: "600053" },
      { name: "Guindy", pincode: "600032" }
    ]
  },
  {
    name: "Madurai",
    taluks: [
      { name: "Madurai North", pincode: "625002" },
      { name: "Madurai South", pincode: "625001" },
      { name: "Thirumangalam", pincode: "625706" }
    ]
  },
  {
    name: "Coimbatore",
    taluks: [
      { name: "Coimbatore North", pincode: "641001" },
      { name: "Coimbatore South", pincode: "641018" },
      { name: "Pollachi", pincode: "642001" }
    ]
  },
  {
    name: "Salem",
    taluks: [
      { name: "Salem", pincode: "636001" },
      { name: "Mettur", pincode: "636401" }
    ]
  },
  {
    name: "Trichy",
    taluks: [
      { name: "Trichy East", pincode: "620008" },
      { name: "Trichy West", pincode: "620001" }
    ]
  }
];

const allDistricts = [
  "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", 
  "Dindigul", "Erode", "Kallakurichi", "Kancheepuram", "Karur", "Krishnagiri", 
  "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", 
  "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi", 
  "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupathur", 
  "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", 
  "Virudhunagar"
];

async function main() {
  console.log("Seeding Districts and Taluks...");

  for (const distName of allDistricts) {
    const district = await prisma.district.upsert({
      where: { name: distName },
      update: {},
      create: { name: distName }
    });

    const locationData = tnLocations.find(l => l.name === distName || (distName === "Tiruchirappalli" && l.name === "Trichy"));
    if (locationData) {
      for (const talukData of locationData.taluks) {
        const existingTaluk = await prisma.taluk.findFirst({
            where: { name: talukData.name, districtId: district.id }
        });

        if (!existingTaluk) {
            await prisma.taluk.create({
                data: {
                    name: talukData.name,
                    pincode: talukData.pincode,
                    districtId: district.id
                }
            });
            console.log(`Created Taluk: ${talukData.name} in ${distName}`);
        }
      }
    }
  }

  console.log("Location seeding finished!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
