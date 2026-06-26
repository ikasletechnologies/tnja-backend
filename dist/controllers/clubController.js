import prisma from "../lib/prisma.js";
export const getClubs = async (req, res) => {
    console.log("GET /api/clubs hit");
    try {
        const { districtId, talukId } = req.query;
        const where = { status: "APPROVED" };
        if (districtId)
            where.districtId = String(districtId);
        if (talukId)
            where.talukId = String(talukId);
        const clubs = await prisma.club.findMany({
            where,
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