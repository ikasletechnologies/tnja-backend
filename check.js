import prisma from "./src/lib/prisma.js";
async function main() {
    const club = await prisma.club.findFirst();
    console.log("Club password:", club?.password === "" ? "EMPTY_STRING" : club?.password);
}
main().finally(() => prisma.$disconnect());
//# sourceMappingURL=check.js.map