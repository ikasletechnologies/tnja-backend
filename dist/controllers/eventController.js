import prisma from "../lib/prisma.js";
import Razorpay from "razorpay";
import crypto from "crypto";
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});
export const createEvent = async (req, res) => {
    const { title, description, date, location, level, participantType, districtId, zoneId, isPaid, entryFee } = req.body;
    const { userId, role } = req.user;
    try {
        // Only CLUB role or admin roles can propose events
        const adminRoles = ["SUPER_ADMIN", "STATE_PRESIDENT", "STATE_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "CEO"];
        if (role !== "CLUB" && !adminRoles.includes(role)) {
            return res.status(403).json({ error: "Only clubs or authorized admins can propose events" });
        }
        if (!title || !description || !date || !location || !level) {
            return res.status(400).json({ error: "Title, description, date, location, and level are required" });
        }
        // Validate level requirements
        if (level === "DISTRICT" && !districtId) {
            return res.status(400).json({ error: "District ID is required for district-level events" });
        }
        if (level === "ZONE" && !zoneId) {
            return res.status(400).json({ error: "Zone ID is required for zone-level events" });
        }
        const newEvent = await prisma.event.create({
            data: {
                title,
                description,
                date: new Date(date),
                location,
                level,
                participantType: participantType || "ALL",
                districtId: level === "DISTRICT" ? districtId : null,
                zoneId: level === "ZONE" ? zoneId : null,
                createdBy: userId,
                status: "PENDING",
                isPaid: !!isPaid,
                entryFee: isPaid ? Number(entryFee) || 0 : 0,
            },
        });
        return res.status(201).json({ message: "Event proposed successfully", event: newEvent });
    }
    catch (error) {
        console.error("Error creating event:", error);
        return res.status(500).json({ error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) });
    }
};
export const getActiveEvents = async (req, res) => {
    try {
        const { role, userId } = req.user || { role: "GUEST" };
        // Map the user's role to the participant type
        let targetParticipant = "ALL";
        if (role === "STUDENT" || role === "PLAYER")
            targetParticipant = "STUDENT";
        else if (role === "COACH")
            targetParticipant = "COACH";
        else if (role === "CLUB")
            targetParticipant = "CLUB";
        else if (role === "MEMBER")
            targetParticipant = "MEMBER";
        const events = await prisma.event.findMany({
            where: {
                status: "APPROVED",
                // Admins can see all, otherwise only see 'ALL' or specific target
                participantType: ["SUPER_ADMIN", "STATE_PRESIDENT", "STATE_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "CEO"].includes(role)
                    ? undefined
                    : { in: ["ALL", targetParticipant] }
            },
            include: {
                district: { select: { name: true } },
                registrations: {
                    where: { userId: userId || "" }
                }
            },
            orderBy: { date: "asc" },
        });
        return res.json(events);
    }
    catch (error) {
        console.error("Error fetching active events:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
export const getAdminEvents = async (req, res) => {
    try {
        const { role, districtId } = req.user;
        const eventWhere = {};
        // Apply role-based scope
        if (["DISTRICT_PRESIDENT", "DISTRICT_SECRETARY"].includes(role)) {
            eventWhere.level = "DISTRICT";
            if (districtId) {
                eventWhere.districtId = districtId;
            }
        }
        else if (["ZONE_PRESIDENT", "ZONE_SECRETARY"].includes(role)) {
            eventWhere.level = "ZONE";
            if (districtId) {
                // Here, we use the user's districtId to find their zone, but zoneId isn't on the user. 
                // We will assume the user has a zoneId or their district maps to a zone. 
                // For now, if zoneId is stored in districtId claim, we use it. 
                eventWhere.zoneId = districtId;
            }
        }
        const events = await prisma.event.findMany({
            where: eventWhere,
            include: { district: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
        });
        return res.json(events);
    }
    catch (error) {
        console.error("Error fetching admin events:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
export const applyForEvent = async (req, res) => {
    try {
        const { eventId } = req.body;
        const { userId, role } = req.user;
        if (!eventId) {
            return res.status(400).json({ error: "Event ID is required" });
        }
        const event = await prisma.event.findUnique({ where: { id: eventId } });
        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }
        const existingRegistration = await prisma.eventRegistration.findUnique({
            where: {
                eventId_userId: {
                    eventId,
                    userId
                }
            }
        });
        if (existingRegistration) {
            return res.status(400).json({ error: "You have already applied for this event" });
        }
        const registration = await prisma.eventRegistration.create({
            data: {
                eventId,
                userId,
                role,
                status: "APPROVED"
            }
        });
        return res.status(201).json({ message: "Successfully applied for event", registration });
    }
    catch (error) {
        console.error("Error applying for event:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
export const createEventPaymentOrder = async (req, res) => {
    const { eventId } = req.body;
    const { userId } = req.user;
    try {
        if (!eventId) {
            return res.status(400).json({ error: "Event ID is required" });
        }
        const event = await prisma.event.findUnique({ where: { id: eventId } });
        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }
        if (!event.isPaid) {
            return res.status(400).json({ error: "This event is free, no payment required" });
        }
        const existingRegistration = await prisma.eventRegistration.findUnique({
            where: {
                eventId_userId: {
                    eventId,
                    userId,
                },
            },
        });
        if (existingRegistration) {
            return res.status(400).json({ error: "You have already applied for this event" });
        }
        const receiptId = `evt_${eventId.substring(0, 10)}_${userId.substring(0, 10)}`;
        const options = {
            amount: Math.round(event.entryFee * 100), // amount in paise
            currency: "INR",
            receipt: receiptId,
        };
        const order = await razorpay.orders.create(options);
        return res.json(order);
    }
    catch (error) {
        console.error("Error creating event payment order:", error);
        return res.status(500).json({ error: "Failed to create payment order" });
    }
};
export const verifyEventPayment = async (req, res) => {
    const { eventId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    const { userId, role } = req.user;
    try {
        if (!eventId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
            return res.status(400).json({ error: "Missing required payment fields" });
        }
        // Verify signature
        const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "");
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generatedSignature = hmac.digest("hex");
        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({ error: "Invalid payment signature" });
        }
        const event = await prisma.event.findUnique({ where: { id: eventId } });
        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }
        // Check existing registration
        const existingRegistration = await prisma.eventRegistration.findUnique({
            where: {
                eventId_userId: {
                    eventId,
                    userId,
                },
            },
        });
        if (existingRegistration) {
            return res.status(400).json({ error: "Already registered for this event" });
        }
        // Create the registration as APPROVED
        const registration = await prisma.eventRegistration.create({
            data: {
                eventId,
                userId,
                role,
                status: "APPROVED",
            },
        });
        // Send confirmation email with receipt
        let userDetails = null;
        if (role === "STUDENT" || role === "PLAYER") {
            userDetails = await prisma.student.findUnique({ where: { id: userId } });
        }
        else if (role === "COACH") {
            userDetails = await prisma.coachReferee.findUnique({ where: { id: userId } });
        }
        else if (role === "CLUB") {
            userDetails = await prisma.club.findUnique({ where: { id: userId } });
        }
        else {
            userDetails = await prisma.member.findUnique({ where: { id: userId } });
        }
        if (userDetails) {
            try {
                const { sendEventRegistrationEmail } = await import("../lib/mailer.js");
                await sendEventRegistrationEmail({
                    toEmail: userDetails.email,
                    toName: userDetails.fullName || userDetails.name,
                    eventName: event.title,
                    eventDate: new Date(event.date).toLocaleDateString("en-IN"),
                    eventLocation: event.location,
                    amountPaid: event.entryFee,
                    paymentId: razorpay_payment_id,
                });
            }
            catch (mailErr) {
                console.error("Error sending event registration email:", mailErr);
            }
        }
        return res.status(201).json({ message: "Payment verified & applied for event successfully", registration });
    }
    catch (error) {
        console.error("Error verifying event payment:", error);
        return res.status(500).json({ error: "Payment verification failed" });
    }
};
//# sourceMappingURL=eventController.js.map