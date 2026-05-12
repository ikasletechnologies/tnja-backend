import prisma from "../lib/prisma.js";
export const getClubs = async (req, res) => {
    console.log("GET /api/clubs hit");
    try {
        const clubs = await prisma.club.findMany({
            include: {
                district: true,
                taluk: true,
            },
            orderBy: {
                name: 'asc'
            }
        });
        return res.json(clubs);
    }
    catch (error) {
        console.error("Error fetching clubs:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
//# sourceMappingURL=clubController.js.map