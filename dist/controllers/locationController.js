import prisma from "../lib/prisma.js";
export const getDistricts = async (req, res) => {
    try {
        const districts = await prisma.district.findMany({
            orderBy: { name: 'asc' }
        });
        return res.json(districts);
    }
    catch (error) {
        console.error("Error fetching districts:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
export const getTaluksByDistrict = async (req, res) => {
    const districtId = String(req.params.districtId);
    try {
        const taluks = await prisma.taluk.findMany({
            where: { districtId },
            orderBy: { name: 'asc' }
        });
        return res.json(taluks);
    }
    catch (error) {
        console.error("Error fetching taluks:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
export const getTalukDetails = async (req, res) => {
    const id = String(req.params.id);
    try {
        const taluk = await prisma.taluk.findUnique({
            where: { id }
        });
        if (!taluk)
            return res.status(404).json({ error: "Taluk not found" });
        return res.json(taluk);
    }
    catch (error) {
        console.error("Error fetching taluk details:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
//# sourceMappingURL=locationController.js.map