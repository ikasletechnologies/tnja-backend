import prisma from "../lib/prisma.js";
import bcrypt from "bcrypt";
export const getPublicCoaches = async (req, res) => {
    try {
        const { districtId, talukId } = req.query;
        const where = { status: "APPROVED" };
        if (districtId)
            where.districtId = String(districtId);
        if (talukId)
            where.talukId = String(talukId);
        const coaches = await prisma.coachReferee.findMany({
            where,
            select: {
                id: true,
                fullName: true,
                districtId: true,
                talukId: true,
            },
            orderBy: { fullName: "asc" }
        });
        return res.json(coaches);
    }
    catch (error) {
        console.error("Error fetching public coaches:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
export const getPublicMembers = async (req, res) => {
    try {
        const { districtId, talukId } = req.query;
        const where = { status: "APPROVED" };
        if (districtId)
            where.districtId = String(districtId);
        if (talukId)
            where.talukId = String(talukId);
        const members = await prisma.member.findMany({
            where,
            select: {
                id: true,
                fullName: true,
                districtId: true,
                talukId: true,
            },
            orderBy: { fullName: "asc" }
        });
        return res.json(members);
    }
    catch (error) {
        console.error("Error fetching public members:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
export const getAllUsers = async (req, res) => {
    try {
        const { role: requesterRole, districtId } = req.user;
        const allowedRoles = ["SUPER_ADMIN", "STATE_PRESIDENT", "STATE_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "DISTRICT_PRESIDENT", "DISTRICT_SECRETARY"];
        if (!allowedRoles.includes(requesterRole)) {
            return res.status(403).json({ error: "You do not have permission to view the directory" });
        }
        const where = {};
        const districtRestrictedRoles = ["DISTRICT_PRESIDENT", "DISTRICT_SECRETARY"];
        if (districtRestrictedRoles.includes(requesterRole) && districtId) {
            where.districtId = districtId;
        }
        const [students, coaches, members, clubs] = await Promise.all([
            prisma.student.findMany({
                where,
                select: {
                    id: true, fullName: true, email: true, tempId: true, permanentId: true, status: true, mobileNumber: true, createdAt: true, districtId: true,
                    district: { select: { name: true } }, taluk: { select: { name: true } },
                    profilePhoto: true, aadhaarProof: true, incomeProof: true, bplProof: true,
                    wins: true, losses: true, draws: true, coachId: true,
                    coach: { select: { fullName: true } }
                },
            }),
            prisma.coachReferee.findMany({
                where,
                select: {
                    id: true, fullName: true, email: true, tempId: true, permanentId: true, status: true, mobileNumber: true, createdAt: true, districtId: true,
                    district: { select: { name: true } }, taluk: { select: { name: true } },
                    profilePhoto: true
                },
            }),
            prisma.member.findMany({
                where,
                select: {
                    id: true, fullName: true, email: true, tempId: true, permanentId: true, status: true, mobileNumber: true, role: true, createdAt: true, districtId: true,
                    district: { select: { name: true } }, taluk: { select: { name: true } },
                    profilePhoto: true, aadhaarFront: true, aadhaarBack: true
                },
            }),
            prisma.club.findMany({
                where,
                select: { id: true, name: true, email: true, permanentId: true, status: true, mobileNumber: true, createdAt: true, districtId: true, district: { select: { name: true } }, taluk: { select: { name: true } } },
            }),
        ]);
        const allUsers = [
            ...students.map(u => ({ ...u, role: "STUDENT", districtName: u.district?.name, talukName: u.taluk?.name })),
            ...coaches.map(u => ({ ...u, role: "COACH", districtName: u.district?.name, talukName: u.taluk?.name })),
            ...members.map(u => ({ ...u, role: u.role, districtName: u.district?.name, talukName: u.taluk?.name })),
            ...clubs.map(u => ({ ...u, fullName: u.name, tempId: u.id, role: "CLUB", districtName: u.district?.name, talukName: u.taluk?.name })),
        ];
        return res.json(allUsers);
    }
    catch (error) {
        console.error("Error fetching all users:", error);
        if (error instanceof Error) {
            console.error(error.stack);
        }
        return res.status(500).json({ error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) });
    }
};
export const updateUserCredentials = async (req, res) => {
    const { userId, role, permanentId, password, wins, losses, draws, coachId } = req.body;
    if (!userId || !role) {
        return res.status(400).json({ error: "User ID and role are required" });
    }
    try {
        const updateData = {};
        if (permanentId !== undefined)
            updateData.permanentId = permanentId;
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }
        let updated;
        if (role === "STUDENT") {
            if (wins !== undefined)
                updateData.wins = Number(wins) || 0;
            if (losses !== undefined)
                updateData.losses = Number(losses) || 0;
            if (draws !== undefined)
                updateData.draws = Number(draws) || 0;
            if (coachId !== undefined)
                updateData.coachId = coachId || null;
            updated = await prisma.student.update({ where: { id: userId }, data: updateData });
        }
        else if (role === "COACH") {
            updated = await prisma.coachReferee.update({ where: { id: userId }, data: updateData });
        }
        else if (["MEMBER", "DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY"].includes(role)) {
            updated = await prisma.member.update({ where: { id: userId }, data: updateData });
        }
        else if (role === "CLUB") {
            updated = await prisma.club.update({ where: { id: userId }, data: updateData });
        }
        else {
            return res.status(400).json({ error: "Invalid role" });
        }
        return res.json({ message: "User credentials updated successfully", data: updated });
    }
    catch (error) {
        console.error("Error updating user credentials:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
//# sourceMappingURL=userManagementController.js.map