import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";
import { studentRegistrationSchema, coachRegistrationSchema, clubRegistrationSchema, memberRegistrationSchema } from "../validation/registrationSchema.js";
import crypto from "crypto";
import { sendClubRegistrationEmail } from "../lib/mailer.js";
// Helper to generate IDs
const generateTempId = (prefix) => {
    return `${prefix}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
};
// Helper to generate random password
const generatePassword = () => {
    return crypto.randomBytes(4).toString("hex");
};
export const registerStudent = async (req, res) => {
    console.log("POST /register/student - Body:", req.body);
    try {
        const validatedData = studentRegistrationSchema.parse(req.body);
        // Check if district and taluk exist
        const district = await prisma.district.findUnique({ where: { id: validatedData.districtId } });
        if (!district)
            return res.status(400).json({ error: "Selected District does not exist." });
        const taluk = await prisma.taluk.findUnique({ where: { id: validatedData.talukId } });
        if (!taluk)
            return res.status(400).json({ error: "Selected Taluk does not exist." });
        // Check if club exists if clubId is provided
        if (validatedData.clubId) {
            const club = await prisma.club.findUnique({
                where: { id: validatedData.clubId }
            });
            if (!club) {
                return res.status(400).json({ error: "The selected Club does not exist." });
            }
        }
        else {
            validatedData.clubId = null;
        }
        // Check if email or mobile or aadhaar exists
        const existing = await prisma.student.findFirst({
            where: {
                OR: [
                    { email: validatedData.email },
                    { mobileNumber: validatedData.mobileNumber },
                    { aadhaarNumber: validatedData.aadhaarNumber }
                ]
            }
        });
        if (existing) {
            return res.status(400).json({ error: "Student with this email, mobile or Aadhaar already exists" });
        }
        const tempId = generateTempId("TEMP-STU");
        const rawPassword = generatePassword();
        const hashedPassword = await bcrypt.hash(rawPassword, 10);
        const student = await prisma.student.create({
            data: {
                ...validatedData,
                tempId,
                password: hashedPassword,
                status: "PENDING"
            }
        });
        console.log(`Email sent to ${student.email}: Temp ID: ${tempId}, Password: ${rawPassword}`);
        return res.status(201).json({
            message: "Registration successful. Check your email for login details.",
            tempId: student.tempId
        });
    }
    catch (error) {
        console.log("Error caught in registerStudent:", error);
        if (error.name === "ZodError" || error.issues) {
            return res.status(400).json({ errors: error.issues || error.errors || [] });
        }
        console.error("Student Registration error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
export const registerCoach = async (req, res) => {
    console.log("POST /register/coach - Body:", req.body);
    try {
        const validatedData = coachRegistrationSchema.parse(req.body);
        const district = await prisma.district.findUnique({ where: { id: validatedData.districtId } });
        if (!district)
            return res.status(400).json({ error: "Selected District does not exist." });
        const taluk = await prisma.taluk.findUnique({ where: { id: validatedData.talukId } });
        if (!taluk)
            return res.status(400).json({ error: "Selected Taluk does not exist." });
        if (validatedData.clubId) {
            const club = await prisma.club.findUnique({
                where: { id: validatedData.clubId }
            });
            if (!club) {
                return res.status(400).json({ error: "The selected Club does not exist." });
            }
        }
        else {
            validatedData.clubId = null;
        }
        const existing = await prisma.coachReferee.findFirst({
            where: {
                OR: [
                    { email: validatedData.email },
                    { mobileNumber: validatedData.mobileNumber },
                    { aadhaarNumber: validatedData.aadhaarNumber }
                ]
            }
        });
        if (existing) {
            return res.status(400).json({ error: "Coach/Referee with this email, mobile or Aadhaar already exists" });
        }
        const tempId = generateTempId("TEMP-COA");
        const rawPassword = generatePassword();
        const hashedPassword = await bcrypt.hash(rawPassword, 10);
        const coach = await prisma.coachReferee.create({
            data: {
                ...validatedData,
                tempId,
                password: hashedPassword,
                status: "PENDING"
            }
        });
        console.log(`Email sent to ${coach.email}: Temp ID: ${tempId}, Password: ${rawPassword}`);
        return res.status(201).json({
            message: "Registration successful. Check your email for login details.",
            tempId: coach.tempId
        });
    }
    catch (error) {
        if (error.name === "ZodError" || error.issues) {
            return res.status(400).json({ errors: error.issues || error.errors || [] });
        }
        console.error("Coach Registration error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
export const registerClub = async (req, res) => {
    console.log("POST /register/club - Body:", req.body);
    try {
        const validatedData = clubRegistrationSchema.parse(req.body);
        const district = await prisma.district.findUnique({ where: { id: validatedData.districtId } });
        if (!district)
            return res.status(400).json({ error: "Selected District does not exist." });
        const taluk = await prisma.taluk.findUnique({ where: { id: validatedData.talukId } });
        if (!taluk)
            return res.status(400).json({ error: "Selected Taluk does not exist." });
        const existing = await prisma.club.findFirst({
            where: {
                OR: [
                    { email: validatedData.email },
                    { mobileNumber: validatedData.mobileNumber }
                ]
            }
        });
        if (existing) {
            return res.status(400).json({ error: "Club with this email or mobile number already exists" });
        }
        const { clubName, ...rest } = validatedData;
        const tempId = generateTempId("TEMP-CLB");
        const club = await prisma.club.create({
            data: {
                ...rest,
                name: clubName,
                tempId,
                status: "PENDING"
            }
        });
        // Send receipt email to club
        try {
            await sendClubRegistrationEmail({
                toEmail: club.email,
                toName: club.name
            });
        }
        catch (mailErr) {
            console.error("[Mailer] Failed to send club registration receipt:", mailErr);
        }
        return res.status(201).json({
            message: "Club registration successful. Application is pending Super Admin approval.",
            clubId: club.id,
            tempId: club.tempId
        });
    }
    catch (error) {
        if (error.name === "ZodError" || error.issues) {
            return res.status(400).json({ errors: error.issues || error.errors || [] });
        }
        console.error("Club Registration error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
export const registerMember = async (req, res) => {
    console.log("POST /register/member - Body:", req.body);
    try {
        const validatedData = memberRegistrationSchema.parse(req.body);
        const district = await prisma.district.findUnique({ where: { id: validatedData.districtId } });
        if (!district)
            return res.status(400).json({ error: "Selected District does not exist." });
        const taluk = await prisma.taluk.findUnique({ where: { id: validatedData.talukId } });
        if (!taluk)
            return res.status(400).json({ error: "Selected Taluk does not exist." });
        const existing = await prisma.member.findFirst({
            where: {
                OR: [
                    { email: validatedData.email },
                    { mobileNumber: validatedData.mobileNumber },
                    { aadhaarNumber: validatedData.aadhaarNumber }
                ]
            }
        });
        if (existing) {
            return res.status(400).json({ error: "Member with this email, mobile or Aadhaar already exists" });
        }
        const tempId = generateTempId("TEMP-MEM");
        const rawPassword = generatePassword();
        const hashedPassword = await bcrypt.hash(rawPassword, 10);
        const member = await prisma.member.create({
            data: {
                ...validatedData,
                tempId,
                password: hashedPassword,
                status: "PENDING"
            }
        });
        console.log(`Email sent to ${member.email}: Temp ID: ${tempId}, Password: ${rawPassword}`);
        return res.status(201).json({
            message: "Registration successful. Check your email for login details.",
            tempId: member.tempId
        });
    }
    catch (error) {
        if (error.name === "ZodError" || error.issues) {
            return res.status(400).json({ errors: error.issues || error.errors || [] });
        }
        console.error("Member Registration error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
//# sourceMappingURL=registrationController.js.map