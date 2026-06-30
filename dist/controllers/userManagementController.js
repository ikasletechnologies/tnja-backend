import prisma from "../lib/prisma.js";
import bcrypt from "bcrypt";
import { sendAccountDeletionEmail } from "../lib/mailer.js";
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
                email: true,
                mobileNumber: true,
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
        const { role: requesterRole, districtId: requesterDistrictId } = req.user;
        const { role, status, districtId, talukId, search, gender } = req.query;
        const allowedRoles = ["SUPER_ADMIN", "STATE_PRESIDENT", "STATE_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "CEO"];
        if (!allowedRoles.includes(requesterRole)) {
            return res.status(403).json({ error: "You do not have permission to view the directory" });
        }
        const baseWhere = {};
        const districtRestrictedRoles = ["DISTRICT_PRESIDENT", "DISTRICT_SECRETARY"];
        // 1. Enforce district restriction for district admins, otherwise allow optional filtering
        if (districtRestrictedRoles.includes(requesterRole) && requesterDistrictId) {
            baseWhere.districtId = requesterDistrictId;
        }
        else if (districtId) {
            baseWhere.districtId = String(districtId);
        }
        if (talukId)
            baseWhere.talukId = String(talukId);
        // Default to APPROVED if no specific status is requested
        if (status) {
            baseWhere.status = String(status);
        }
        else {
            baseWhere.status = "APPROVED";
        }
        // 2. Search filter
        const searchStr = search ? String(search) : undefined;
        const commonSearch = searchStr ? {
            OR: [
                { fullName: { contains: searchStr, mode: "insensitive" } },
                { email: { contains: searchStr, mode: "insensitive" } },
                { mobileNumber: { contains: searchStr } },
                { tempId: { contains: searchStr, mode: "insensitive" } },
                { permanentId: { contains: searchStr, mode: "insensitive" } }
            ]
        } : {};
        const clubSearch = searchStr ? {
            OR: [
                { name: { contains: searchStr, mode: "insensitive" } },
                { email: { contains: searchStr, mode: "insensitive" } },
                { mobileNumber: { contains: searchStr } },
                { tempId: { contains: searchStr, mode: "insensitive" } },
                { permanentId: { contains: searchStr, mode: "insensitive" } }
            ]
        } : {};
        // 3. Role filter logic (determining which queries to run)
        const genderFilter = gender ? { gender: String(gender) } : {};
        let fetchStudents = true, fetchCoaches = true, fetchMembers = true, fetchClubs = true;
        let memberRoleFilter = undefined;
        if (role) {
            const qRole = String(role);
            fetchStudents = qRole === "STUDENT";
            fetchCoaches = qRole === "COACH";
            fetchClubs = qRole === "CLUB";
            const memberRoles = ["MEMBER", "DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY", "CEO"];
            if (qRole === "MEMBER") {
                fetchMembers = true;
                memberRoleFilter = memberRoles; // Return all member roles when "MEMBER" is requested
            }
            else if (memberRoles.includes(qRole)) {
                fetchMembers = true;
                memberRoleFilter = qRole;
            }
            else {
                fetchMembers = false;
            }
        }
        const [students, coaches, members, clubs] = await Promise.all([
            fetchStudents ? prisma.student.findMany({
                where: { ...baseWhere, ...commonSearch, ...genderFilter },
                select: {
                    id: true, fullName: true, email: true, tempId: true, permanentId: true, status: true, mobileNumber: true, createdAt: true, districtId: true,
                    validUntil: true, district: { select: { name: true } }, taluk: { select: { name: true } },
                    profilePhoto: true, bplProof: true,
                    wins: true, losses: true, draws: true, coachId: true, coach: { select: { fullName: true } }
                },
            }) : Promise.resolve([]),
            fetchCoaches ? prisma.coachReferee.findMany({
                where: { ...baseWhere, ...commonSearch, ...genderFilter },
                select: {
                    id: true, fullName: true, email: true, tempId: true, permanentId: true, status: true, mobileNumber: true, createdAt: true, districtId: true,
                    validUntil: true, district: { select: { name: true } }, taluk: { select: { name: true } }, profilePhoto: true
                },
            }) : Promise.resolve([]),
            fetchMembers ? prisma.member.findMany({
                where: { ...baseWhere, ...commonSearch, ...(memberRoleFilter ? { role: Array.isArray(memberRoleFilter) ? { in: memberRoleFilter } : memberRoleFilter } : {}), ...genderFilter },
                select: {
                    id: true, fullName: true, email: true, tempId: true, permanentId: true, status: true, mobileNumber: true, role: true, createdAt: true, districtId: true,
                    validUntil: true, district: { select: { name: true } }, taluk: { select: { name: true } }, profilePhoto: true
                },
            }) : Promise.resolve([]),
            fetchClubs ? prisma.club.findMany({
                where: { ...baseWhere, ...clubSearch },
                select: { id: true, name: true, email: true, tempId: true, permanentId: true, status: true, mobileNumber: true, createdAt: true, districtId: true, validUntil: true, district: { select: { name: true } }, taluk: { select: { name: true } } },
            }) : Promise.resolve([]),
        ]);
        const allUsers = [
            ...students.map(u => ({ ...u, role: "STUDENT", districtName: u.district?.name, talukName: u.taluk?.name })),
            ...coaches.map(u => ({ ...u, role: "COACH", districtName: u.district?.name, talukName: u.taluk?.name })),
            ...members.map(u => ({ ...u, role: u.role, districtName: (['DISTRICT_PRESIDENT', 'DISTRICT_SECRETARY'].includes(u.role) && u.assignedDistrict) ? u.assignedDistrict.name : u.district?.name, talukName: u.taluk?.name })),
            ...clubs.map(u => ({ ...u, fullName: u.name, role: "CLUB", districtName: u.district?.name, talukName: u.taluk?.name })),
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
export const updateUserProfile = async (req, res) => {
    const { role: requesterRole } = req.user;
    if (requesterRole !== "SUPER_ADMIN" && requesterRole !== "CEO") {
        return res.status(403).json({ error: "Only Super Admin or CEO can edit user profiles" });
    }
    const { userId, role, ...fields } = req.body;
    if (!userId || !role) {
        return res.status(400).json({ error: "userId and role are required" });
    }
    try {
        // Strip out fields that should never be updated here (credentials, system fields)
        const denied = new Set(["id", "tempId", "permanentId", "tempId", "password", "status", "isPaid", "createdAt", "updatedAt", "resetPasswordToken", "resetPasswordExpires", "mustChangePassword"]);
        const safe = {};
        for (const [k, v] of Object.entries(fields)) {
            if (!denied.has(k) && v !== undefined && v !== null && v !== "") {
                safe[k] = v;
            }
        }
        let updated;
        if (role === "STUDENT") {
            if (safe.dob)
                safe.dob = new Date(safe.dob);
            if (safe.age)
                safe.age = Number(safe.age);
            if (safe.annualIncome !== undefined)
                safe.annualIncome = Number(safe.annualIncome);
            updated = await prisma.student.update({ where: { id: userId }, data: safe });
        }
        else if (role === "COACH") {
            if (safe.dob)
                safe.dob = new Date(safe.dob);
            if (safe.age)
                safe.age = Number(safe.age);
            updated = await prisma.coachReferee.update({ where: { id: userId }, data: safe });
        }
        else if (["MEMBER", "DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY", "CEO"].includes(role)) {
            if (safe.dob)
                safe.dob = new Date(safe.dob);
            updated = await prisma.member.update({ where: { id: userId }, data: safe });
        }
        else if (role === "CLUB") {
            if (safe.noOfStudents !== undefined)
                safe.noOfStudents = Number(safe.noOfStudents);
            if (safe.maleStudents !== undefined)
                safe.maleStudents = Number(safe.maleStudents);
            if (safe.femaleStudents !== undefined)
                safe.femaleStudents = Number(safe.femaleStudents);
            updated = await prisma.club.update({ where: { id: userId }, data: safe });
        }
        else {
            return res.status(400).json({ error: "Invalid role" });
        }
        return res.json({ message: "Profile updated successfully", data: updated });
    }
    catch (error) {
        console.error("Error updating user profile:", error);
        return res.status(500).json({ error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) });
    }
};
export const updateUserCredentials = async (req, res) => {
    const { userId, role, password, wins, losses, draws, coachId } = req.body;
    if (!userId || !role) {
        return res.status(400).json({ error: "User ID and role are required" });
    }
    try {
        const updateData = {};
        // permanentId is intentionally excluded — it is system-assigned and immutable
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
        else if (["MEMBER", "DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY", "CEO"].includes(role)) {
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
// ─── COACH: Get My Students with Performance Data ───────────────────────────
export const getCoachStudents = async (req, res) => {
    const { userId, role } = req.user;
    if (role !== "COACH") {
        return res.status(403).json({ error: "Only coaches can access this endpoint" });
    }
    try {
        // Fetch all students under this coach
        const students = await prisma.student.findMany({
            where: { coachId: userId, status: "APPROVED" },
            select: {
                id: true,
                fullName: true,
                age: true,
                gender: true,
                profilePhoto: true,
                wins: true,
                losses: true,
                draws: true,
                permanentId: true,
                tempId: true,
            },
            orderBy: { fullName: "asc" },
        });
        // Calculate performance metrics for each student
        const studentsWithPerformance = students.map((student) => {
            const totalMatches = student.wins + student.losses + student.draws;
            const winRate = totalMatches > 0 ? Math.round((student.wins / totalMatches) * 100) : 0;
            return {
                id: student.id,
                fullName: student.fullName,
                age: student.age,
                gender: student.gender,
                profilePhoto: student.profilePhoto,
                permanentId: student.permanentId,
                tempId: student.tempId,
                performance: {
                    wins: student.wins,
                    losses: student.losses,
                    draws: student.draws,
                    totalMatches,
                    winRate,
                },
            };
        });
        // Get tournament participation count for each student
        const studentsWithTournaments = await Promise.all(studentsWithPerformance.map(async (student) => {
            const tournamentCount = await prisma.tournamentRegistration.count({
                where: { playerId: student.id },
            });
            return {
                ...student,
                tournamentCount,
            };
        }));
        return res.json({
            totalStudents: studentsWithTournaments.length,
            students: studentsWithTournaments,
        });
    }
    catch (error) {
        console.error("Error fetching coach students:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
export const deleteUser = async (req, res) => {
    try {
        const id = req.params.id;
        const type = req.params.type;
        if (!id || !type) {
            return res.status(400).json({ error: "Missing user ID or type" });
        }
        const { role } = req.user;
        if (role !== "SUPER_ADMIN" && role !== "CEO") {
            return res.status(403).json({ error: "Forbidden: Only Super Admins can delete users" });
        }
        try {
            let deletedUser = null;
            let userRoleForEmail = "";
            if (type === "CLUB") {
                deletedUser = await prisma.club.findUnique({ where: { id } });
                userRoleForEmail = "Club";
                if (deletedUser)
                    await prisma.club.delete({ where: { id } });
            }
            else if (type === "STUDENT") {
                deletedUser = await prisma.student.findUnique({ where: { id } });
                userRoleForEmail = "Player";
                if (deletedUser)
                    await prisma.student.delete({ where: { id } });
            }
            else if (type === "COACH") {
                deletedUser = await prisma.coachReferee.findUnique({ where: { id } });
                userRoleForEmail = "Coach/Referee";
                if (deletedUser)
                    await prisma.coachReferee.delete({ where: { id } });
            }
            else if (type === "MEMBER") {
                deletedUser = await prisma.member.findUnique({ where: { id } });
                userRoleForEmail = "Member";
                if (deletedUser)
                    await prisma.member.delete({ where: { id } });
            }
            else {
                return res.status(400).json({ error: "Invalid user type" });
            }
            if (deletedUser && deletedUser.email) {
                // Send email asynchronously without blocking the response
                sendAccountDeletionEmail({
                    toEmail: deletedUser.email,
                    toName: deletedUser.fullName || deletedUser.clubName || "User",
                    role: userRoleForEmail,
                }).catch(err => console.error("Error sending deletion email:", err));
            }
            return res.json({ success: true, message: "User deleted successfully" });
        }
        catch (dbError) {
            if (dbError.code === "P2003") {
                return res.status(400).json({
                    error: "Cannot delete user because they are linked to active records (e.g. tournament matches, students). Please remove associated records first."
                });
            }
            throw dbError;
        }
    }
    catch (error) {
        console.error("Error deleting user:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
export const getUserDetails = async (req, res) => {
    try {
        const id = req.params.id;
        const type = req.params.type;
        if (!id || !type) {
            return res.status(400).json({ error: "Missing user ID or type" });
        }
        const { role } = req.user;
        if (role !== "SUPER_ADMIN" && role !== "CEO") {
            return res.status(403).json({ error: "Forbidden: Insufficient privileges" });
        }
        let userDetails = null;
        if (type === "CLUB") {
            userDetails = await prisma.club.findUnique({ where: { id } });
        }
        else if (type === "STUDENT") {
            userDetails = await prisma.student.findUnique({ where: { id } });
        }
        else if (type === "COACH") {
            userDetails = await prisma.coachReferee.findUnique({ where: { id } });
        }
        else if (type === "MEMBER") {
            userDetails = await prisma.member.findUnique({ where: { id } });
        }
        else {
            return res.status(400).json({ error: "Invalid user type" });
        }
        if (!userDetails) {
            return res.status(404).json({ error: "User not found" });
        }
        // Omit password from response
        const { password, ...safeDetails } = userDetails;
        return res.json({ success: true, data: safeDetails });
    }
    catch (error) {
        console.error("Error fetching user details:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
//# sourceMappingURL=userManagementController.js.map