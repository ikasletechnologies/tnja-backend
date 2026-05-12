import prisma from "../lib/prisma.js";
import bcrypt from "bcrypt";
export const getAllUsers = async (req, res) => {
    try {
        const [students, coaches, members, clubs] = await Promise.all([
            prisma.student.findMany({
                select: { id: true, fullName: true, email: true, tempId: true, permanentId: true, status: true, mobileNumber: true, createdAt: true, district: { select: { name: true } } },
            }),
            prisma.coachReferee.findMany({
                select: { id: true, fullName: true, email: true, tempId: true, permanentId: true, status: true, mobileNumber: true, createdAt: true, district: { select: { name: true } } },
            }),
            prisma.member.findMany({
                select: { id: true, fullName: true, email: true, tempId: true, permanentId: true, status: true, mobileNumber: true, createdAt: true, district: { select: { name: true } } },
            }),
            prisma.club.findMany({
                select: { id: true, name: true, email: true, permanentId: true, status: true, mobileNumber: true, createdAt: true, district: { select: { name: true } } },
            }),
        ]);
        const allUsers = [
            ...students.map(u => ({ ...u, role: "STUDENT", districtName: u.district?.name })),
            ...coaches.map(u => ({ ...u, role: "COACH", districtName: u.district?.name })),
            ...members.map(u => ({ ...u, role: "MEMBER", districtName: u.district?.name })),
            ...clubs.map(u => ({ ...u, fullName: u.name, tempId: u.id, role: "CLUB", districtName: u.district?.name })),
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
    const { userId, role, permanentId, password } = req.body;
    if (!userId || !role) {
        return res.status(400).json({ error: "User ID and role are required" });
    }
    try {
        const updateData = {};
        if (permanentId)
            updateData.permanentId = permanentId;
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }
        let updated;
        if (role === "STUDENT") {
            updated = await prisma.student.update({ where: { id: userId }, data: updateData });
        }
        else if (role === "COACH") {
            updated = await prisma.coachReferee.update({ where: { id: userId }, data: updateData });
        }
        else if (role === "MEMBER") {
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