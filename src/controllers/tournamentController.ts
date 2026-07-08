import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import { sendNotificationToUser } from "../lib/ws.js";
import { sendEventRegistrationEmail, sendNewTournamentAnnouncement } from "../lib/mailer.js";

// ─── HELPER: Calculate Age Group ────────────────────────────────────────────
export const getAgeGroup = (age: number, category?: string): string => {
  if (category) {
    if (category.includes("Mini Sub-Junior Age Group 1") && age <= 7) return category;
    if (category.includes("Mini Sub-Junior Age Group 2") && age <= 9) return category;
    if (category.includes("Mini Sub-Junior Age Group 3") && age <= 11) return category;
    if (category.includes("Sub-Junior") && age >= 12 && age <= 14) return category;
    if (category.includes("Cadet") && age >= 15 && age <= 17) return category;
    if (category.includes("Junior") && age >= 15 && age <= 20) return category;
    if (category.includes("Senior") && age >= 15) return category;
    if (category.includes("Veteran") && age >= 35) return category;
  }

  if (age <= 7) return "Mini Sub-Junior Age Group 1";
  if (age <= 9) return "Mini Sub-Junior Age Group 2";
  if (age <= 11) return "Mini Sub-Junior Age Group 3";
  if (age <= 14) return "Sub-Junior";
  if (age <= 17) return "Cadet";
  if (age <= 20) return "Junior";
  if (age < 35) return "Senior";
  return "Veteran";
};

// ─── HELPER: Get Weight Category ────────────────────────────────────────────
export const getWeightCategory = (weightKg: number, gender: string, ageGroup: string): string => {
  const w = weightKg;
  const isMale = gender === "MALE";

  if (ageGroup.includes("Age Group 1")) {
    if (isMale) {
      if (w <= 20) return "-20kg";
      if (w <= 25) return "-25kg";
      if (w <= 30) return "-30kg";
      return "+30kg";
    } else {
      if (w <= 18) return "-18kg";
      if (w <= 22) return "-22kg";
      if (w <= 26) return "-26kg";
      return "+26kg";
    }
  }

  if (ageGroup.includes("Age Group 2")) {
    if (isMale) {
      if (w <= 25) return "-25kg";
      if (w <= 30) return "-30kg";
      if (w <= 35) return "-35kg";
      return "+35kg";
    } else {
      if (w <= 22) return "-22kg";
      if (w <= 26) return "-26kg";
      if (w <= 30) return "-30kg";
      return "+30kg";
    }
  }

  if (ageGroup.includes("Age Group 3")) {
    if (isMale) {
      if (w <= 30) return "-30kg";
      if (w <= 35) return "-35kg";
      if (w <= 40) return "-40kg";
      if (w <= 45) return "-45kg";
      return "+45kg";
    } else {
      if (w <= 28) return "-28kg";
      if (w <= 32) return "-32kg";
      if (w <= 36) return "-36kg";
      if (w <= 40) return "-40kg";
      return "+40kg";
    }
  }

  if (ageGroup.includes("Sub-Junior")) {
    if (isMale) {
      if (w <= 30) return "-30kg";
      if (w <= 35) return "-35kg";
      if (w <= 40) return "-40kg";
      if (w <= 45) return "-45kg";
      if (w <= 50) return "-50kg";
      if (w <= 55) return "-55kg";
      if (w <= 60) return "-60kg";
      if (w <= 66) return "-66kg";
      return "+66kg";
    } else {
      if (w <= 28) return "-28kg";
      if (w <= 32) return "-32kg";
      if (w <= 36) return "-36kg";
      if (w <= 40) return "-40kg";
      if (w <= 44) return "-44kg";
      if (w <= 48) return "-48kg";
      if (w <= 52) return "-52kg";
      if (w <= 57) return "-57kg";
      return "+57kg";
    }
  }

  if (ageGroup.includes("Cadet")) {
    if (isMale) {
      if (w <= 50) return "-50kg";
      if (w <= 55) return "-55kg";
      if (w <= 60) return "-60kg";
      if (w <= 66) return "-66kg";
      if (w <= 73) return "-73kg";
      if (w <= 81) return "-81kg";
      if (w <= 90) return "-90kg";
      return "+90kg";
    } else {
      if (w <= 40) return "-40kg";
      if (w <= 44) return "-44kg";
      if (w <= 48) return "-48kg";
      if (w <= 52) return "-52kg";
      if (w <= 57) return "-57kg";
      if (w <= 63) return "-63kg";
      if (w <= 70) return "-70kg";
      return "+70kg";
    }
  }

  if (ageGroup.includes("Junior")) {
    if (isMale) {
      if (w <= 55) return "-55kg";
      if (w <= 60) return "-60kg";
      if (w <= 66) return "-66kg";
      if (w <= 73) return "-73kg";
      if (w <= 81) return "-81kg";
      if (w <= 90) return "-90kg";
      if (w <= 100) return "-100kg";
      return "+100kg";
    } else {
      if (w <= 44) return "-44kg";
      if (w <= 48) return "-48kg";
      if (w <= 52) return "-52kg";
      if (w <= 57) return "-57kg";
      if (w <= 63) return "-63kg";
      if (w <= 70) return "-70kg";
      if (w <= 78) return "-78kg";
      return "+78kg";
    }
  }

  // Senior / Veteran
  if (isMale) {
    if (w <= 60) return "-60kg";
    if (w <= 66) return "-66kg";
    if (w <= 73) return "-73kg";
    if (w <= 81) return "-81kg";
    if (w <= 90) return "-90kg";
    if (w <= 100) return "-100kg";
    return "+100kg";
  } else {
    if (w <= 48) return "-48kg";
    if (w <= 52) return "-52kg";
    if (w <= 57) return "-57kg";
    if (w <= 63) return "-63kg";
    if (w <= 70) return "-70kg";
    if (w <= 78) return "-78kg";
    return "+78kg";
  }
};

// ─── HELPER: Create or Get Tournament Draw ──────────────────────────────────
const createOrGetDraw = async (tournamentId: string, gender: string, ageGroup: string, weightCategory: string, exactAge: number = 0) => {
  try {
    const draw = await prisma.tournamentDraw.upsert({
      where: {
        tournamentId_ageGroup_exactAge_gender_weightCategory: {
          tournamentId,
          ageGroup,
          exactAge,
          gender,
          weightCategory,
        },
      },
      update: {}, // No update needed, just get existing
      create: {
        tournamentId,
        ageGroup,
        exactAge,
        gender,
        weightCategory,
        rounds: { participants: [] }, // Initialize empty rounds
      },
    });
    return draw;
  } catch (error) {
    console.error("Error creating/getting draw:", error);
    return null;
  }
};

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

// ─── CLUB: Create Tournament ─────────────────────────────────────────────────
export const createTournament = async (req: Request, res: Response) => {
  const { userId, role } = (req as any).user;

  const isClub = role === "CLUB";
  const isOfficial = ["DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY", "CEO", "SUPER_ADMIN"].includes(role);

  if (!isClub && !isOfficial) {
    return res.status(403).json({ error: "Only clubs or authorized officials can create tournaments" });
  }

  const { title, dateFrom, dateTo, location, description, entryFee, numberOfMats, ageFrom, ageTo, category, gender, allowBPL, beltEligibility, bannerImage, level, zoneId } = req.body;

  if (!title || !dateFrom || !location || !description || entryFee === undefined || !level) {
    return res.status(400).json({ error: "Required fields missing" });
  }

  try {
    // Initial approval setup based on level
    let districtApproval = level === "NATIONAL" ? "PENDING" : "APPROVED";
    let stateApproval = ["NATIONAL", "STATE", "ZONE", "DISTRICT"].includes(level) ? "PENDING" : "APPROVED";
    const superAdminApproval = "PENDING";
    const ceoApproval = ["NATIONAL", "STATE", "ZONE"].includes(level) ? "PENDING" : "NOT_REQUIRED";

    if (isOfficial) {
      if (role === "STATE_PRESIDENT" || role === "STATE_SECRETARY" || role === "CEO" || role === "SUPER_ADMIN") {
        districtApproval = "NOT_REQUIRED";
        stateApproval = "NOT_REQUIRED";
      } else if (role === "DISTRICT_PRESIDENT" || role === "DISTRICT_SECRETARY" || role === "ZONE_PRESIDENT" || role === "ZONE_SECRETARY") {
        districtApproval = "NOT_REQUIRED";
        // stateApproval remains PENDING
      }
    }

    const tournament = await prisma.tournament.create({
      data: {
        title,
        date: new Date(dateFrom),
        dateTo: dateTo ? new Date(dateTo) : null,
        location,
        description,
        entryFee: Number(entryFee),
        numberOfMats: numberOfMats ? Number(numberOfMats) : 1,
        ageFrom: Number(ageFrom || 0),
        ageTo: Number(ageTo || 100),
        category: category || null,
        gender: gender || "BOTH",
        allowBPL: Boolean(allowBPL),
        beltEligibility: beltEligibility || null,
        bannerImage: bannerImage || null,
        level,
        zoneId: zoneId || null,
        clubId: isClub ? userId : null,
        officialId: (isOfficial && role !== "SUPER_ADMIN") ? userId : null,
        status: "PENDING",
        districtApproval: districtApproval as any,
        stateApproval: stateApproval as any,
        superAdminApproval,
        ceoApproval,
      },
    });

    if (isClub) {
      // Notify all paid players of this club who are currently online
      const paidPlayers = await prisma.student.findMany({
        where: { clubId: userId, isPaid: true, status: "APPROVED" },
        select: { id: true, fullName: true },
      });

      for (const player of paidPlayers) {
        sendNotificationToUser(player.id, {
          type: "NEW_TOURNAMENT",
          message: `Your club has proposed a new tournament: "${title}" on ${new Date(dateFrom).toLocaleDateString("en-IN")}. It is currently waiting for approvals.`,
          tournamentId: tournament.id,
          createdAt: new Date().toISOString(),
        });
      }
    }

    return res.status(201).json({ message: "Tournament created successfully", tournament });
  } catch (error) {
    console.error("Error creating tournament:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ─── START TOURNAMENT (Close Registrations) ──────────────────────────────────
export const startTournament = async (req: Request, res: Response) => {
  const { userId, role } = (req as any).user;
  const id = req.params.id as string;

  try {
    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });

    const isCreator = tournament.clubId === userId || tournament.officialId === userId;
    const isOfficial = ["SUPER_ADMIN", "CEO", "STATE_PRESIDENT", "STATE_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "DISTRICT_PRESIDENT", "DISTRICT_SECRETARY"].includes(role);

    if (!isCreator && !isOfficial) {
      return res.status(403).json({ error: "You don't have permission to start this tournament" });
    }

    const updated = await prisma.tournament.update({
      where: { id },
      data: { registrationClosed: true }
    });

    return res.json({ message: "Tournament started successfully", tournament: updated });
  } catch (error) {
    console.error("Error starting tournament:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ─── CLUB: Get My Tournaments ────────────────────────────────────────────────
export const getClubTournaments = async (req: Request, res: Response) => {
  const { userId, role } = (req as any).user;

  const isClub = role === "CLUB";
  const isOfficial = ["DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY", "CEO", "SUPER_ADMIN"].includes(role);

  if (!isClub && !isOfficial) {
    return res.status(403).json({ error: "Access denied" });
  }

  try {
    const whereClause = isClub 
      ? { clubId: userId } 
      : (role === "SUPER_ADMIN" ? { officialId: null, clubId: null } : { officialId: userId });

    const tournaments = await prisma.tournament.findMany({
      where: whereClause,
      include: {
        _count: { select: { registrations: true } },
        registrations: { where: { status: "PENDING" }, select: { id: true }, take: 1 }
      },
      orderBy: { date: "asc" },
    });

    const result = tournaments.map((t) => ({
      ...t,
      registrationCount: t._count.registrations,
      hasPendingPlayers: t.registrations.length > 0,
      registrations: undefined,
      _count: undefined,
    }));

    return res.json(result);
  } catch (error) {
    console.error("Error fetching club tournaments:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ─── CLUB: Get All Approved Tournaments ──────────────────────────────────────
export const getApprovedTournaments = async (req: Request, res: Response) => {
  const { role } = (req as any).user;

  if (role !== "CLUB") {
    return res.status(403).json({ error: "Access denied" });
  }

  try {
    const tournaments = await prisma.tournament.findMany({
      where: { status: "APPROVED" },
      include: {
        _count: { select: { registrations: true } },
        registrations: { where: { status: "PENDING" }, select: { id: true }, take: 1 },
        club: { select: { name: true, district: { select: { name: true } } } }
      },
      orderBy: { date: "desc" },
    });

    const result = tournaments.map((t) => ({
      ...t,
      registrationCount: t._count.registrations,
      hasPendingPlayers: t.registrations.length > 0,
      registrations: undefined,
      _count: undefined,
    }));

    return res.json(result);
  } catch (error) {
    console.error("Error fetching approved tournaments:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ─── CLUB: Get Registrations for a Tournament ────────────────────────────────
export const getTournamentRegistrations = async (req: Request, res: Response) => {
  const { userId, role } = (req as any).user;
  const id = req.params.id as string;

  const isClub = role === "CLUB";
  const isOfficial = ["DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY", "CEO", "SUPER_ADMIN"].includes(role);

  if (!isClub && !isOfficial) {
    return res.status(403).json({ error: "Access denied" });
  }

  try {
    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });
    if (!isOfficial && tournament.clubId !== userId && tournament.officialId !== userId) {
      return res.status(403).json({ error: "This tournament does not belong to you" });
    }

    const registrations = await prisma.tournamentRegistration.findMany({
      where: { tournamentId: id },
      include: {
        player: {
          select: { id: true, fullName: true, permanentId: true, tempId: true, email: true, gender: true, age: true, club: { select: { name: true } } },
        },
        coach: { select: { fullName: true } }
      },
      orderBy: { createdAt: "asc" },
    });

    const formattedRegistrations = registrations.map(reg => ({
      ...reg,
      ageGroup: getAgeGroup(reg.player.age)
    }));

    return res.json(formattedRegistrations);
  } catch (error) {
    console.error("Error fetching tournament registrations:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ─── CLUB: Get Messages for a Registration ───────────────────────────────────
export const getRegistrationMessages = async (req: Request, res: Response) => {
  const regId = req.params.regId as string;
  try {
    const messages = await prisma.tournamentRegistrationMessage.findMany({
      where: { registrationId: regId },
      orderBy: { createdAt: "asc" },
    });
    return res.json(messages);
  } catch (error) {
    console.error("Error fetching registration messages:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ─── CLUB: Approve or Reject a Registration ──────────────────────────────────
export const updateRegistrationStatus = async (req: Request, res: Response) => {
  const { userId, role } = (req as any).user;
  const tournamentId = req.params.id as string;
  const regId = req.params.regId as string;
  const { status, message } = req.body;

  const isClub = role === "CLUB";
  const isOfficial = ["DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY", "CEO", "SUPER_ADMIN"].includes(role);

  if (!isClub && !isOfficial) {
    return res.status(403).json({ error: "Access denied" });
  }

  if (!["APPROVED", "REJECTED"].includes(status)) {
    return res.status(400).json({ error: "Status must be APPROVED or REJECTED" });
  }

  try {
    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });
    if (tournament.clubId !== userId && tournament.officialId !== userId) return res.status(403).json({ error: "This tournament does not belong to you" });

    const existingRegistration = await prisma.tournamentRegistration.findUnique({
      where: { id: regId },
      include: { player: { select: { id: true, fullName: true, email: true } } },
    });
    
    if (!existingRegistration) return res.status(404).json({ error: "Registration not found" });
    if (existingRegistration.status === status) {
      return res.json({ message: `Registration is already ${status.toLowerCase()}`, registration: existingRegistration });
    }

    const registration = await prisma.tournamentRegistration.update({
      where: { id: regId },
      data: { status },
      include: { player: { select: { id: true, fullName: true, email: true } } },
    });

    const defaultNotificationMsg = status === "APPROVED"
      ? `Your registration for "${tournament.title}" has been approved by the club!`
      : `Your registration for "${tournament.title}" has been rejected by the club.`;

    const defaultChatMsg = status === "APPROVED"
      ? `Registration Approved.`
      : `Registration Rejected.`;

    const finalNotificationMsg = message?.trim() || defaultNotificationMsg;
    const finalChatMsg = message?.trim() || defaultChatMsg;

    // Save message to DB as a chat record
    await prisma.tournamentRegistrationMessage.create({
      data: {
        registrationId: regId,
        senderRole: role,
        senderName: "Club",
        message: `[${status}] ${finalChatMsg}`,
      },
    });

    sendNotificationToUser(registration.playerId, {
      type: "TOURNAMENT_REG_UPDATE",
      message: finalNotificationMsg,
      tournamentId,
      createdAt: new Date().toISOString(),
    });

    if (status === "APPROVED" && registration.player.email) {
      try {
        await sendEventRegistrationEmail({
          toEmail: registration.player.email,
          toName: registration.player.fullName,
          eventName: tournament.title,
          eventDate: new Date(tournament.date).toLocaleDateString("en-IN"),
          eventLocation: tournament.location,
          amountPaid: tournament.entryFee,
          paymentId: registration.paymentId || "Free/BPL Registration",
        });
      } catch (err) {
        console.error("Failed to send approval email:", err);
      }
    }

    return res.json({ message: `Registration ${status.toLowerCase()} successfully`, registration });
  } catch (error) {
    console.error("Error updating registration status:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const disqualifyRegistration = async (req: Request, res: Response) => {
  const regId = req.params.regId as string;
  const { currentWeight } = req.body;
  const { userId, role } = (req as any).user;

  try {
    const registration = await prisma.tournamentRegistration.findUnique({
      where: { id: regId },
      include: { tournament: true, player: true },
    });

    if (!registration) return res.status(404).json({ error: "Registration not found" });
    if (registration.tournament.clubId !== userId && registration.tournament.officialId !== userId && role !== "SUPER_ADMIN" && role !== "CEO") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Add a message about the disqualification
    await prisma.tournamentRegistrationMessage.create({
      data: {
        registrationId: regId,
        senderRole: "SYSTEM",
        senderName: "Tournament Admin",
        message: `Player was disqualified. Actual weigh-in weight: ${currentWeight}kg.`,
      }
    });

    const updated = await prisma.tournamentRegistration.update({
      where: { id: regId },
      data: { status: "DISQUALIFIED" },
    });

    return res.json({ message: "Player disqualified", registration: updated });
  } catch (error) {
    console.error("Error disqualifying registration:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ─── CLUB/OFFICIAL: Update Registration Metrics (Weight/Height) ───────────────
export const updateRegistrationMetrics = async (req: Request, res: Response) => {
  const { userId, role } = (req as any).user;
  const tournamentId = req.params.id as string;
  const regId = req.params.regId as string;
  const { weight, height } = req.body;

  const isClub = role === "CLUB";
  const isOfficial = ["DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY", "CEO", "SUPER_ADMIN"].includes(role);

  if (!isClub && !isOfficial) {
    return res.status(403).json({ error: "Access denied" });
  }

  try {
    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });
    if (tournament.clubId !== userId && tournament.officialId !== userId) {
      return res.status(403).json({ error: "This tournament does not belong to you" });
    }

    if (tournament.status === "CLOSED") {
      return res.status(400).json({ error: "Cannot edit metrics for a completed tournament" });
    }

    const registration = await prisma.tournamentRegistration.findUnique({
      where: { id: regId },
    });
    
    if (!registration) return res.status(404).json({ error: "Registration not found" });

    const updatedRegistration = await prisma.tournamentRegistration.update({
      where: { id: regId },
      data: { weight: weight || registration.weight, height: height || registration.height },
    });

    if (weight || height) {
      await prisma.student.update({
        where: { id: registration.playerId },
        data: {
          ...(weight && { weight }),
          ...(height && { height })
        }
      });
    }

    return res.json({ message: "Metrics updated successfully", registration: updatedRegistration });
  } catch (error) {
    console.error("Error updating registration metrics:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ─── CLUB: Send Reply to a Player Registration ───────────────────────────────
export const sendRegistrationReply = async (req: Request, res: Response) => {
  const { userId, role } = (req as any).user;
  const tournamentId = req.params.id as string;
  const regId = req.params.regId as string;
  const { message } = req.body;

  const isClub = role === "CLUB";
  const isOfficial = ["DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY", "CEO", "SUPER_ADMIN"].includes(role);

  if (!isClub && !isOfficial) return res.status(403).json({ error: "Access denied" });
  if (!message?.trim()) return res.status(400).json({ error: "Message is required" });

  try {
    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });
    if (tournament.clubId !== userId && tournament.officialId !== userId) return res.status(403).json({ error: "This tournament does not belong to you" });

    const registration = await prisma.tournamentRegistration.findUnique({
      where: { id: regId },
      select: { playerId: true },
    });
    if (!registration) return res.status(404).json({ error: "Registration not found" });

    // Save to DB
    await prisma.tournamentRegistrationMessage.create({
      data: {
        registrationId: regId,
        senderRole: role,
        senderName: "Club",
        message: message.trim(),
      },
    });

    sendNotificationToUser(registration.playerId, {
      type: "TOURNAMENT_REG_UPDATE",
      message: message.trim(),
      tournamentId,
      createdAt: new Date().toISOString(),
    });

    return res.json({ message: "Reply sent successfully" });
  } catch (error) {
    console.error("Error sending registration reply:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ─── CLUB: Update Tournament ─────────────────────────────────────────────────
export const updateTournament = async (req: Request, res: Response) => {
  const { userId, role } = (req as any).user;
  const id = req.params.id as string;

  const isClub = role === "CLUB";
  const isOfficial = ["DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY", "CEO", "SUPER_ADMIN"].includes(role);

  if (!isClub && !isOfficial) {
    return res.status(403).json({ error: "Only clubs and officials can update tournaments" });
  }

  const { title, dateFrom, dateTo, location, description, entryFee, numberOfMats, ageFrom, ageTo, category, gender, allowBPL, beltEligibility, bannerImage, level, zoneId } = req.body;

  try {
    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });
    if (tournament.clubId !== userId && tournament.officialId !== userId) return res.status(403).json({ error: "This tournament does not belong to you" });

    const updated = await prisma.tournament.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(dateFrom && { date: new Date(dateFrom) }),
        ...(dateTo !== undefined && { dateTo: dateTo ? new Date(dateTo) : null }),
        ...(location && { location }),
        ...(description && { description }),
        ...(entryFee !== undefined && { entryFee: Number(entryFee) }),
        ...(numberOfMats !== undefined && { numberOfMats: Number(numberOfMats) }),
        ...(ageFrom !== undefined && { ageFrom: Number(ageFrom) }),
        ...(ageTo !== undefined && { ageTo: Number(ageTo) }),
        ...(category !== undefined && { category }),
        ...(gender && { gender }),
        ...(allowBPL !== undefined && { allowBPL: Boolean(allowBPL) }),
        ...(beltEligibility !== undefined && { beltEligibility }),
        ...(bannerImage !== undefined && { bannerImage }),
        ...(level && { level }),
        ...(zoneId !== undefined && { zoneId }),
      },
    });

    return res.json({ message: "Tournament updated successfully", tournament: updated });
  } catch (error) {
    console.error("Error updating tournament:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ─── CLUB: Delete Tournament ──────────────────────────────────────────────────
export const deleteTournament = async (req: Request, res: Response) => {
  const { userId, role } = (req as any).user;
  const id = req.params.id as string;

  const isClub = role === "CLUB";
  const isOfficial = ["DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY", "CEO", "SUPER_ADMIN"].includes(role);

  if (!isClub && !isOfficial) {
    return res.status(403).json({ error: "Only clubs and officials can delete tournaments" });
  }

  try {
    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });
    if (tournament.clubId !== userId && tournament.officialId !== userId) return res.status(403).json({ error: "This tournament does not belong to you" });

    // Delete registrations first (FK constraint)
    await prisma.tournamentRegistration.deleteMany({ where: { tournamentId: id } });
    await prisma.tournament.delete({ where: { id } });

    return res.json({ message: "Tournament deleted successfully" });
  } catch (error) {
    console.error("Error deleting tournament:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ─── PLAYER: Get Club Tournaments ────────────────────────────────────────────
export const getPlayerTournaments = async (req: Request, res: Response) => {
  const { userId, role } = (req as any).user;

  if (role !== "PLAYER" && role !== "STUDENT") {
    return res.status(403).json({ error: "Only players can access this endpoint" });
  }

  try {
    const player = await prisma.student.findUnique({
      where: { id: userId },
      select: { clubId: true, isPaid: true, isBPL: true },
    });

    if (!player) return res.status(404).json({ error: "Player not found" });
    if (!player.clubId) return res.json([]); // Player not linked to a club

    const tournaments = await prisma.tournament.findMany({
      where: { clubId: player.clubId, status: { in: ["APPROVED", "CLOSED"] } },
      include: {
        _count: { select: { registrations: true } },
        registrations: {
          where: { playerId: userId },
          select: { id: true, status: true, isPaid: true, placement: true },
        },
      },
      orderBy: { date: "desc" },
    });

    const result = tournaments.map((t) => ({
      ...t,
      registrationCount: t._count.registrations,
      myRegistration: t.registrations[0] || null,
      registrations: undefined,
      _count: undefined,
    }));

    return res.json(result);
  } catch (error) {
    console.error("Error fetching player tournaments:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ─── PLAYER: Get District / State / National Matches ─────────────────────────
// District matches: level=DISTRICT, club in player's district
// State matches:    level=STATE, approved
// National matches: level=NATIONAL, approved
export const getPlayerPublicMatches = async (req: Request, res: Response) => {
  const { userId, role } = (req as any).user;

  if (role !== "PLAYER" && role !== "STUDENT") {
    return res.status(403).json({ error: "Only players can access this endpoint" });
  }

  try {
    const player = await prisma.student.findUnique({
      where: { id: userId },
      select: {
        districtId: true,
        isPaid: true,
        isBPL: true,
        gender: true,
        district: { select: { zoneName: true } }
      },
    });

    if (!player) return res.status(404).json({ error: "Player not found" });

    // District-level: only from clubs in same district, matching player's gender
    const districtTournaments = await prisma.tournament.findMany({
      where: {
        status: { in: ["APPROVED", "CLOSED"] },
        level: "DISTRICT",
        club: { districtId: player.districtId },
        OR: [
          { gender: "BOTH" },
          { gender: player.gender }
        ]
      },
      include: {
        _count: { select: { registrations: true } },
        registrations: { where: { playerId: userId }, select: { id: true, status: true, isPaid: true, placement: true } },
        club: { select: { name: true, district: { select: { name: true } } } },
      },
      orderBy: { date: "desc" },
    });

    // Zonal-level: level=ZONE, match tournament's zoneId with player's zone, matching player's gender
    const zonalTournaments = await prisma.tournament.findMany({
      where: {
        status: { in: ["APPROVED", "CLOSED"] },
        level: "ZONE",
        zoneId: player.district?.zoneName ?? "",
        OR: [
          { gender: "BOTH" },
          { gender: player.gender }
        ]
      },
      include: {
        _count: { select: { registrations: true } },
        registrations: { where: { playerId: userId }, select: { id: true, status: true, isPaid: true, placement: true } },
        club: { select: { name: true, district: { select: { name: true } } } },
      },
      orderBy: { date: "desc" },
    });

    // State & National: open to all players, but must match gender
    const stateNationalTournaments = await prisma.tournament.findMany({
      where: {
        status: { in: ["APPROVED", "CLOSED"] },
        level: { in: ["STATE", "NATIONAL"] },
        OR: [
          { gender: "BOTH" },
          { gender: player.gender }
        ]
      },
      include: {
        _count: { select: { registrations: true } },
        registrations: { where: { playerId: userId }, select: { id: true, status: true, isPaid: true, placement: true } },
        club: { select: { name: true, district: { select: { name: true } } } },
      },
      orderBy: { date: "desc" },
    });

    const mapTournament = (t: any) => ({
      ...t,
      registrationCount: t._count.registrations,
      myRegistration: t.registrations[0] || null,
      registrations: undefined,
      _count: undefined,
    });

    return res.json({
      district: districtTournaments.map(mapTournament),
      zonal: zonalTournaments.map(mapTournament),
      stateAndNational: stateNationalTournaments.map(mapTournament),
    });
  } catch (error) {
    console.error("Error fetching player public matches:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ─── PLAYER: Create Tournament Payment Order ────────────────────────────────
export const createTournamentPaymentOrder = async (req: Request, res: Response) => {
  const { userId, role } = (req as any).user;
  const { tournamentId, height, weight, coachId, category } = req.body;

  if (role !== "PLAYER" && role !== "STUDENT") {
    return res.status(403).json({ error: "Only players can register for tournaments" });
  }

  if (!tournamentId) {
    return res.status(400).json({ error: "tournamentId is required" });
  }

  try {
    const player = await prisma.student.findUnique({
      where: { id: userId },
      select: { clubId: true, districtId: true, isPaid: true, isBPL: true, age: true, gender: true },
    });

    if (!player) return res.status(404).json({ error: "Player not found" });
    if (!player.isPaid && !player.isBPL) {
      return res.status(403).json({ error: "Complete your membership payment before joining a tournament" });
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { club: { select: { districtId: true } } },
    });
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });

    // ── Access restriction based on tournament level ──────────────────────
    if (tournament.level === "DISTRICT") {
      // District match: player must be from the same district as the organising club
      const tournamentDistrictId = tournament.club?.districtId;
      if (!tournamentDistrictId || tournamentDistrictId !== player.districtId) {
        return res.status(403).json({ error: "This district match is only open to players from the same district" });
      }
    } else if ((tournament.level as any) === "CLUB") {
      // Club tournament: player must belong to the same club
      if (tournament.clubId !== player.clubId) {
        return res.status(403).json({ error: "This tournament is only for members of the organising club" });
      }
    }
    // STATE and NATIONAL: no restriction — any player can register

    // ── Age and Gender validation ───────────────────────────────────────────
    if (tournament.ageFrom && player.age < tournament.ageFrom) {
      return res.status(403).json({ error: `You must be at least ${tournament.ageFrom} years old to join this tournament.` });
    }
    if (tournament.ageTo && player.age > tournament.ageTo) {
      return res.status(403).json({ error: `You must be at most ${tournament.ageTo} years old to join this tournament.` });
    }
    if (tournament.gender && tournament.gender !== "BOTH" && tournament.gender !== player.gender) {
      return res.status(403).json({ error: `This tournament is restricted to ${tournament.gender} players only.` });
    }

    // Slot check removed (totalSlots not in schema)
    // const regCount = await prisma.tournamentRegistration.count({ where: { tournamentId } });

    // Check duplicate
    const existing = await prisma.tournamentRegistration.findUnique({
      where: { tournamentId_playerId: { tournamentId, playerId: userId } },
    });
    if (existing) return res.status(400).json({ error: "You have already registered for this tournament" });

    // Handle Free/BPL Registration
    const isFree = tournament.entryFee === 0 || (tournament.allowBPL && player.isBPL);
    if (isFree) {
      const registration = await prisma.tournamentRegistration.create({
        data: {
          tournamentId,
          playerId: userId,
          status: "APPROVED",
          isPaid: true, // It's free, so consider it paid
          height: height || null,
          weight: weight || null,
          coachId: coachId || null,
        },
      });

      // ─── Auto-create or get tournament draw based on player's category ──
      const playerData = await prisma.student.findUnique({
        where: { id: userId },
        select: { age: true, gender: true },
      });

      if (playerData && weight) {
        const playerGender = playerData.gender === "FEMALE" ? "FEMALE" : "MALE";
        const ageGroup = getAgeGroup(playerData.age, category);
        const weightCategory = getWeightCategory(Number(weight), playerGender, ageGroup);

        // Get tournament's gender (could be MALE, FEMALE, or BOTH)
        const tournamentGender = tournament.gender === "BOTH" ? playerGender : tournament.gender;

        await createOrGetDraw(tournamentId, tournamentGender, ageGroup, weightCategory, playerData.age);
      }

      // Update the student's global profile with latest height/weight
      if (height || weight) {
        await prisma.student.update({
          where: { id: userId },
          data: {
            ...(height && { height: height }),
            ...(weight && { weight: weight })
          }
        });
      }

      // Update the student's global profile with latest height/weight
      if (height || weight) {
        await prisma.student.update({
          where: { id: userId },
          data: {
            ...(height && { height: height }),
            ...(weight && { weight: weight })
          }
        });
      }


      const freOrganiserId = tournament.clubId || tournament.officialId;
      if (freOrganiserId) {
        sendNotificationToUser(freOrganiserId, {
          type: "NEW_TOURNAMENT_REGISTRATION",
          message: `A player has successfully registered for your tournament "${tournament.title}".`,
          tournamentId,
          createdAt: new Date().toISOString(),
        });
      }

      return res.json({ isFree: true, message: "Registered successfully for free tournament.", registration });
    }

    const receipt = `trn_${tournamentId.substring(0, 10)}_${userId.substring(0, 10)}`;
    const order = await razorpay.orders.create({
      amount: Math.round(tournament.entryFee * 100),
      currency: "INR",
      receipt,
    });

    return res.json(order);
  } catch (error) {
    console.error("Error creating tournament payment order:", error);
    return res.status(500).json({ error: "Failed to create payment order" });
  }
};

// ─── PLAYER: Verify Payment & Register ───────────────────────────────────────
export const verifyTournamentPayment = async (req: Request, res: Response) => {
  const { userId, role } = (req as any).user;
  const { tournamentId, razorpay_payment_id, razorpay_order_id, razorpay_signature, height, weight, coachId, category } = req.body;

  if (role !== "PLAYER" && role !== "STUDENT") {
    return res.status(403).json({ error: "Only players can register for tournaments" });
  }

  if (!tournamentId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return res.status(400).json({ error: "Missing required payment fields" });
  }

  try {
    // Verify Razorpay signature
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "");
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });

    const existing = await prisma.tournamentRegistration.findUnique({
      where: { tournamentId_playerId: { tournamentId, playerId: userId } },
    });
    if (existing) return res.status(400).json({ error: "Already registered for this tournament" });

    // Slot check removed (totalSlots not in schema)
    // const regCount = await prisma.tournamentRegistration.count({ where: { tournamentId } });

    const registration = await prisma.tournamentRegistration.create({
      data: {
        tournamentId,
        playerId: userId,
        status: "APPROVED",
        isPaid: true,
        paymentId: razorpay_payment_id,
        height: height || null,
        weight: weight || null,
        coachId: coachId || null,
      },
    });

    // ─── Auto-create or get tournament draw based on player's category ──
    const playerData = await prisma.student.findUnique({
      where: { id: userId },
      select: { age: true, gender: true },
    });

    if (playerData && weight) {
      const playerGender = playerData.gender === "FEMALE" ? "FEMALE" : "MALE";
      const ageGroup = getAgeGroup(playerData.age, category);
      const weightCategory = getWeightCategory(Number(weight), playerGender, ageGroup);

      // Get tournament's gender (could be MALE, FEMALE, or BOTH)
      const tournamentGender = tournament.gender === "BOTH" ? playerGender : tournament.gender;

      await createOrGetDraw(tournamentId, tournamentGender, ageGroup, weightCategory, playerData.age);
    }

    // Update the student's global profile with latest height/weight
    if (height || weight) {
      await prisma.student.update({
        where: { id: userId },
        data: {
          ...(height && { height: height }),
          ...(weight && { weight: weight })
        }
      });
    }

    // Notify the organiser (club or official) that a new player registered
    const organiserId = tournament.clubId || tournament.officialId;
    if (organiserId) {
      sendNotificationToUser(organiserId, {
        type: "NEW_TOURNAMENT_REGISTRATION",
        message: `A player has paid and successfully registered for your tournament "${tournament.title}".`,
        tournamentId,
        createdAt: new Date().toISOString(),
      });
    }

    return res.status(201).json({
      message: "Payment verified. Registration successful.",
      registration,
    });
  } catch (error) {
    console.error("Error verifying tournament payment:", error);
    return res.status(500).json({ error: "Payment verification failed" });
  }
};

// ─── ADMIN: Get Tournaments Pending Approval ────────────────────────────────
export const getAdminTournaments = async (req: Request, res: Response) => {
  const { role } = (req as any).user;

  try {
    let whereClause: any = {};

    if (role === "DISTRICT_PRESIDENT" || role === "DISTRICT_SECRETARY") {
      whereClause = { status: "PENDING", districtApproval: "PENDING", level: "NATIONAL" };
    } else if (role === "STATE_PRESIDENT" || role === "STATE_SECRETARY") {
      whereClause = { 
        status: "PENDING",
        stateApproval: "PENDING",
        level: { in: ["NATIONAL", "STATE", "ZONE", "DISTRICT"] }
      };
    } else if (role === "SUPER_ADMIN") {
      // Super Admin sees all pending — both their own queue and CEO's queue combined
      whereClause = {
        status: "PENDING",
        OR: [
          { superAdminApproval: "PENDING" },
          { ceoApproval: "PENDING" },
        ],
      };
    } else if (role === "CEO") {
      // CEO sees all pending — same as Super Admin (no level restriction)
      whereClause = {
        status: "PENDING",
        OR: [
          { ceoApproval: "PENDING" },
          { superAdminApproval: "PENDING" },
        ],
      };
    } else {
      return res.status(403).json({ error: "Access denied" });
    }

    const tournaments = await prisma.tournament.findMany({
      where: whereClause,
      include: {
        _count: { select: { registrations: true } },
        registrations: { where: { status: "PENDING" }, select: { id: true }, take: 1 },
        club: { select: { name: true, district: { select: { name: true } } } }
      },
      orderBy: { createdAt: "desc" },
    });

    const result = tournaments.map((t) => ({
      ...t,
      registrationCount: t._count.registrations,
      hasPendingPlayers: t.registrations.length > 0,
      registrations: undefined,
      _count: undefined,
    }));

    return res.json(result);
  } catch (error) {
    console.error("Error fetching admin tournaments:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ─── ADMIN: Get Tournaments Approved By This Role ────────────────────────────
export const getAdminApprovedTournaments = async (req: Request, res: Response) => {
  const { role } = (req as any).user;

  try {
    let whereClause: any = {};

    if (role === "DISTRICT_PRESIDENT" || role === "DISTRICT_SECRETARY") {
      whereClause = { districtApproval: "APPROVED" };
    } else if (role === "STATE_PRESIDENT" || role === "STATE_SECRETARY") {
      whereClause = { stateApproval: "APPROVED" };
    } else if (role === "SUPER_ADMIN") {
      whereClause = { superAdminApproval: "APPROVED" };
    } else if (role === "CEO") {
      whereClause = { ceoApproval: "APPROVED" };
    } else {
      return res.status(403).json({ error: "Access denied" });
    }

    const tournaments = await prisma.tournament.findMany({
      where: whereClause,
      include: {
        _count: { select: { registrations: true } },
        registrations: { where: { status: "PENDING" }, select: { id: true }, take: 1 },
        club: { select: { name: true, district: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = tournaments.map((t) => ({
      ...t,
      registrationCount: t._count.registrations,
      hasPendingPlayers: t.registrations.length > 0,
      registrations: undefined,
      _count: undefined,
    }));

    return res.json(result);
  } catch (error) {
    console.error("Error fetching admin approved tournaments:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ─── ADMIN: Approve or Reject Tournament ────────────────────────────────────
export const approveTournament = async (req: Request, res: Response) => {
  const { role } = (req as any).user;
  const id = req.params.id as string;
  const { status, remark, message } = req.body;

  if (!["APPROVED", "REJECTED"].includes(status)) {
    return res.status(400).json({ error: "Status must be APPROVED or REJECTED" });
  }

  if (status === "REJECTED" && !remark && !message) {
    return res.status(400).json({ error: "Rejection remark is required" });
  }

  try {
    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });

    const rejectionText = remark || message || "";
    let dataToUpdate: any = {};

    if (status === "REJECTED") {
      dataToUpdate = { status: "REJECTED", rejectionRemark: rejectionText };
      if (role.startsWith("DISTRICT")) dataToUpdate.districtApproval = "REJECTED";
      if (role.startsWith("STATE")) dataToUpdate.stateApproval = "REJECTED";
      if (role === "SUPER_ADMIN") dataToUpdate.superAdminApproval = "REJECTED";
      if (role === "CEO") dataToUpdate.ceoApproval = "REJECTED";
    } else {
      if (role.startsWith("DISTRICT")) dataToUpdate.districtApproval = "APPROVED";
      if (role.startsWith("STATE")) dataToUpdate.stateApproval = "APPROVED";
      if (role === "SUPER_ADMIN") dataToUpdate.superAdminApproval = "APPROVED";
      if (role === "CEO") dataToUpdate.ceoApproval = "APPROVED";

      const distApp = dataToUpdate.districtApproval || tournament.districtApproval;
      const stateApp = dataToUpdate.stateApproval || tournament.stateApproval;
      const saApp = dataToUpdate.superAdminApproval || tournament.superAdminApproval;
      const ceoApp = dataToUpdate.ceoApproval || tournament.ceoApproval;

      // Super Admin and CEO can bypass lower-level approvals
      if (role === "SUPER_ADMIN" || role === "CEO") {
        dataToUpdate.status = "APPROVED";
        dataToUpdate.districtApproval = "APPROVED";
        dataToUpdate.stateApproval = "APPROVED";
        dataToUpdate.superAdminApproval = "APPROVED";
        dataToUpdate.ceoApproval = "APPROVED";
      } else {
        const allDone = ["APPROVED", "NOT_REQUIRED"].includes(distApp) &&
                        ["APPROVED", "NOT_REQUIRED"].includes(stateApp) &&
                        ["APPROVED", "NOT_REQUIRED"].includes(saApp) &&
                        ["APPROVED", "NOT_REQUIRED"].includes(ceoApp);
        if (allDone) {
          dataToUpdate.status = "APPROVED";
        }
      }
    }

    const updated = await prisma.tournament.update({ where: { id }, data: dataToUpdate });

    const notifyId = tournament.clubId || tournament.officialId;
    if (dataToUpdate.status === "APPROVED") {
      if (notifyId) {
        const customMsg = message?.trim();
        sendNotificationToUser(notifyId, {
          type: "TOURNAMENT_APPROVED",
          message: customMsg || `Your tournament "${tournament.title}" has been approved and is now live!`,
          tournamentId: id,
          createdAt: new Date().toISOString(),
        });
      }

      // Background task to send announcement emails to eligible players
      (async () => {
        try {
          const playerWhereClause: any = { status: "APPROVED" };

          if (tournament.level === "DISTRICT" && tournament.clubId) {
            const club = await prisma.club.findUnique({ where: { id: tournament.clubId }, select: { districtId: true } });
            if (club?.districtId) {
              playerWhereClause.districtId = club.districtId;
            }
          } else if (tournament.level === "ZONE" && tournament.zoneId) {
            playerWhereClause.district = { zoneName: tournament.zoneId };
          } else if ((tournament.level as string) === "CLUB" && tournament.clubId) {
            playerWhereClause.clubId = tournament.clubId;
          }

          if (tournament.gender !== "BOTH") {
            playerWhereClause.gender = tournament.gender;
          }

          const eligiblePlayers = await prisma.student.findMany({
            where: playerWhereClause,
            select: { email: true, fullName: true },
          });

          for (const player of eligiblePlayers) {
            if (player.email) {
              await sendNewTournamentAnnouncement({
                toEmail: player.email,
                toName: player.fullName,
                tournamentTitle: tournament.title,
                tournamentDate: new Date(tournament.date).toLocaleDateString("en-IN"),
                tournamentLevel: tournament.level
              }).catch(err => console.error("Failed to send announcement to", player.email, err));
            }
          }
        } catch (err) {
          console.error("Error sending bulk announcement emails:", err);
        }
      })();

    } else if (status === "REJECTED" && notifyId) {
      const customMsg = message?.trim();
      sendNotificationToUser(notifyId, {
        type: "TOURNAMENT_REJECTED",
        message: customMsg || `Your tournament "${tournament.title}" was rejected. Reason: ${rejectionText}`,
        tournamentId: id,
        createdAt: new Date().toISOString(),
      });
    }

    return res.json({ message: `Tournament ${status.toLowerCase()} successfully`, tournament: updated });
  } catch (error) {
    console.error("Error approving tournament:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ─── ADMIN: Send Reply to Tournament Creator ─────────────────────────────────
export const sendTournamentReply = async (req: Request, res: Response) => {
  const { userId, role } = (req as any).user;
  const id = req.params.id as string;
  const { message } = req.body;

  const allowed = ["SUPER_ADMIN", "CEO", "DISTRICT_PRESIDENT", "DISTRICT_SECRETARY",
    "STATE_PRESIDENT", "STATE_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "CLUB"];
  if (!allowed.includes(role)) return res.status(403).json({ error: "Access denied" });
  if (!message?.trim()) return res.status(400).json({ error: "Message is required" });

  try {
    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });

    // Verify user is either a reviewing official or the tournament creator
    const isCreator = (role === "CLUB" && tournament.clubId === userId) || (tournament.officialId === userId);
    const isReviewer = ["SUPER_ADMIN", "CEO", "DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY"].includes(role);

    if (!isCreator && !isReviewer) {
      return res.status(403).json({ error: "You are not authorized to send messages for this tournament" });
    }

    let senderName = "Official";
    if (role === "SUPER_ADMIN") {
      senderName = "Super Admin";
    } else if (role === "CLUB") {
      const club = await prisma.club.findUnique({
        where: { id: userId },
        select: { name: true }
      });
      if (club) senderName = club.name;
    } else {
      const member = await prisma.member.findUnique({
        where: { id: userId },
        select: { fullName: true }
      });
      if (member) senderName = member.fullName;
    }

    // Save message to database
    const replyMessage = await prisma.tournamentMessage.create({
      data: {
        tournamentId: id,
        senderRole: role,
        senderName: senderName,
        message: message.trim(),
      }
    });

    // Notify appropriate parties via WebSocket
    if (isReviewer) {
      // If a reviewer commented, notify the creator
      const creatorId = tournament.clubId || tournament.officialId;
      if (creatorId) {
        sendNotificationToUser(creatorId, {
          type: "TOURNAMENT_APPROVED",
          message: `${senderName} commented on your tournament: "${message.trim()}"`,
          tournamentId: id,
          createdAt: replyMessage.createdAt.toISOString(),
        });
      }
    } else if (isCreator) {
      // If the creator commented, we can notify admins (e.g. using sendNotificationToAdmins if imported)
      try {
        const { sendNotificationToAdmins } = await import("../lib/ws.js");
        sendNotificationToAdmins({
          type: "NEW_TOURNAMENT",
          tournamentId: id,
          message: `Tournament creator (${senderName}) left a comment on "${tournament.title}": "${message.trim()}"`,
        });
      } catch (wsErr) {
        console.error("WS notify admins error:", wsErr);
      }
    }

    return res.json({ message: "Reply sent successfully", reply: replyMessage });
  } catch (error) {
    console.error("Error sending tournament reply:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ─── ANY AUTHORIZED: Get Tournament Messages ──────────────────────────────────
export const getTournamentMessages = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  try {
    const messages = await prisma.tournamentMessage.findMany({
      where: { tournamentId: id },
      orderBy: { createdAt: "asc" }
    });
    return res.json(messages);
  } catch (error) {
    console.error("Error fetching tournament messages:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ─── ANY AUTHORIZED: Get Tournament By Id ────────────────────────────────────
export const getTournamentById = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        club: { select: { name: true, district: { select: { name: true } } } }
      }
    });
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });
    return res.json(tournament);
  } catch (error) {
    console.error("Error fetching tournament by ID:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ─── ANY AUTHORIZED: Get Tournament Draws ────────────────────────────────────
export const getTournamentDraws = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  try {
    const draws = await prisma.tournamentDraw.findMany({
      where: { tournamentId: id }
    });
    return res.json(draws);
  } catch (error) {
    console.error("Error fetching draws:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ─── HELPER: Auto-advance winner to next round ──────────────────────────────
const autoAdvanceWinner = (rounds: any[]): any[] => {
  // Process each round from first to second-to-last
  for (let roundIdx = 0; roundIdx < rounds.length - 1; roundIdx++) {
    const currentRound = rounds[roundIdx];
    const nextRound = rounds[roundIdx + 1];

    // Check each match in current round
    for (let matchIdx = 0; matchIdx < currentRound.length; matchIdx++) {
      const match = currentRound[matchIdx];

      // If match is completed and has a winner
      if (match.status === "COMPLETED" && match.winnerId) {
        // Find which slot in next round this winner should occupy
        const nextMatchIdx = Math.floor(matchIdx / 2);
        const isFirstSlot = matchIdx % 2 === 0; // Slots A and B alternate

        if (nextMatchIdx < nextRound.length) {
          const nextMatch = nextRound[nextMatchIdx];
          const isWinnerA = match.winnerId === match.slotA.playerId;
          const winnerSlot = {
            playerId: match.winnerId,
            playerName: isWinnerA ? match.slotA.playerName : match.slotB.playerName,
            club: isWinnerA ? match.slotA.club : match.slotB.club,
            isBye: false,
            seedNumber: isWinnerA ? match.slotA.seedNumber : match.slotB.seedNumber,
          };

          // Update the appropriate slot (A or B) if it's TBD
          if (isFirstSlot && nextMatch.slotA.playerName === "TBD") {
            nextRound[nextMatchIdx].slotA = winnerSlot;
          } else if (!isFirstSlot && nextMatch.slotB.playerName === "TBD") {
            nextRound[nextMatchIdx].slotB = winnerSlot;
          }
          
          // Bronze Match Logic: If this is the semi-final and a bronze match exists
          if (roundIdx === rounds.length - 2 && nextRound.length > 1) {
            const loserSlot = {
              playerId: isWinnerA ? match.slotB.playerId : match.slotA.playerId,
              playerName: isWinnerA ? match.slotB.playerName : match.slotA.playerName,
              club: isWinnerA ? match.slotB.club : match.slotA.club,
              isBye: false,
              seedNumber: isWinnerA ? match.slotB.seedNumber : match.slotA.seedNumber,
            };

            const bronzeMatch = nextRound[1];
            if (isFirstSlot && bronzeMatch.slotA.playerName === "TBD") {
              nextRound[1].slotA = loserSlot;
            } else if (!isFirstSlot && bronzeMatch.slotB.playerName === "TBD") {
              nextRound[1].slotB = loserSlot;
            }
          }
        }
      }
    }
  }

  return rounds;
};

// ─── ADMIN/CLUB: Save Tournament Draw ────────────────────────────────────────
export const saveTournamentDraw = async (req: Request, res: Response) => {
  const { userId, role } = (req as any).user;
  const id = req.params.id as string;
  const { ageGroup, exactAge, gender, weightCategory, matNumber, rounds } = req.body;

  const isClub = role === "CLUB";
  const isOfficial = ["DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY", "CEO", "SUPER_ADMIN"].includes(role);
  const isCoach = role === "COACH";

  if (!isClub && !isOfficial && !isCoach) {
    return res.status(403).json({ error: "Only authorized personnel can save draws" });
  }

  if (!ageGroup || exactAge === undefined || !gender || !weightCategory || !rounds) {
    return res.status(400).json({ error: "Missing required draw parameters" });
  }

  try {
    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });
    if (
      role !== "SUPER_ADMIN" &&
      role !== "CEO" &&
      tournament.clubId !== userId &&
      tournament.officialId !== userId
    ) {
      if (isCoach) {
        // Verify they are assigned as a referee
        const isAssigned = await prisma.tournamentMat.findFirst({
          where: { tournamentId: id, refereeId: userId }
        });
        if (!isAssigned) {
          return res.status(403).json({ error: "You are not assigned as a referee to this tournament" });
        }
      } else {
        return res.status(403).json({ error: "This tournament does not belong to you" });
      }
    }

    // Auto-advance winners to next round
    const updatedRounds = autoAdvanceWinner(JSON.parse(JSON.stringify(rounds)));

    const draw = await prisma.tournamentDraw.upsert({
      where: {
        tournamentId_ageGroup_exactAge_gender_weightCategory: {
          tournamentId: id,
          ageGroup,
          exactAge: Number(exactAge),
          gender,
          weightCategory,
        }
      },
      update: {
        matNumber: matNumber ? Number(matNumber) : 1,
        rounds: updatedRounds
      },
      create: {
        tournamentId: id,
        ageGroup,
        exactAge: Number(exactAge),
        gender,
        weightCategory,
        matNumber: matNumber ? Number(matNumber) : 1,
        rounds: updatedRounds
      }
    });
    return res.json({ message: "Draw saved successfully", draw });
  } catch (error) {
    console.error("Error saving draw:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ─── ADMIN/CLUB/OFFICIAL: Submit Final Results ───────────────────────────────
export const submitTournamentResults = async (req: Request, res: Response) => {
  const { userId, role } = (req as any).user;
  const id = req.params.id as string;
  const { results } = req.body; // Array of { playerId: string, placement: "FIRST" | "SECOND" | "THIRD" | "PARTICIPATION" }

  const isClub = role === "CLUB";
  const isOfficial = ["DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY", "CEO", "SUPER_ADMIN"].includes(role);

  if (!isClub && !isOfficial) {
    return res.status(403).json({ error: "Only clubs and officials can submit results" });
  }

  try {
    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });
    if (tournament.clubId !== userId && tournament.officialId !== userId) return res.status(403).json({ error: "This tournament does not belong to you" });

    // Ensure all players are registered in this tournament
    const playerIds = results.map((r: any) => r.playerId);
    const validRegistrations = await prisma.tournamentRegistration.findMany({
      where: { tournamentId: id, playerId: { in: playerIds } },
    });

    if (validRegistrations.length !== playerIds.length) {
      return res.status(400).json({ error: "One or more players are not registered in this tournament" });
    }

    // Use a transaction to update placements
    await prisma.$transaction(
      results.map((r: any) =>
        prisma.tournamentRegistration.update({
          where: { tournamentId_playerId: { tournamentId: id, playerId: r.playerId } },
          data: { placement: r.placement },
        })
      )
    );

    // Also close the tournament
    await prisma.tournament.update({
      where: { id },
      data: { status: "CLOSED" },
    });

    return res.json({ message: "Results submitted successfully. Tournament is now closed." });
  } catch (error) {
    console.error("Error submitting results:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getTournamentMats = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const mats = await prisma.tournamentMat.findMany({
      where: { tournamentId: id as string },
      include: { referee: { select: { fullName: true } } },
      orderBy: { matNumber: 'asc' }
    });
    return res.json({ mats });
  } catch (error) {
    console.error("Error fetching tournament mats:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const saveTournamentMats = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { assignments } = req.body; // Array of { matNumber: number, refereeId: string }
  try {
    const tournament = await prisma.tournament.findUnique({ where: { id: id as string } });
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });

    // Resolve referee IDs if they are provided (allows TempID, PermanentID, or UUID)
    const resolvedAssignments = await Promise.all(assignments.map(async (a: any) => {
      let finalRefereeId = null;
      if (a.refereeId) {
        const referee = await prisma.coachReferee.findFirst({
          where: { OR: [ { id: a.refereeId }, { tempId: a.refereeId }, { permanentId: a.refereeId } ] },
          select: { id: true }
        });
        if (referee) finalRefereeId = referee.id;
      }
      return {
        tournamentId: id,
        matNumber: a.matNumber,
        refereeId: finalRefereeId
      };
    }));

    await prisma.$transaction([
      prisma.tournamentMat.deleteMany({ where: { tournamentId: id as string } }),
      prisma.tournamentMat.createMany({
        data: resolvedAssignments
      })
    ]);
    return res.json({ message: "Mat assignments saved successfully." });
  } catch (error) {
    console.error("Error saving tournament mats:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getRefereeMats = async (req: Request | any, res: Response) => {
  try {
    const refereeId = req.user?.userId;
    if (!refereeId) return res.status(401).json({ error: "Unauthorized" });

    const mats = await prisma.tournamentMat.findMany({
      where: { refereeId },
      include: {
        tournament: {
          select: { id: true, title: true, date: true, status: true, location: true }
        }
      },
      orderBy: { tournament: { date: 'desc' } }
    });

    return res.json({ mats });
  } catch (error) {
    console.error("Error fetching referee mats:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const submitMatchResult = async (req: Request, res: Response) => {
  const { id, matchId } = req.params;
  const { winnerId } = req.body;

  try {
    const draws = await prisma.tournamentDraw.findMany({ where: { tournamentId: id as string } });
    
    let updated = false;
    for (const draw of draws) {
      const rounds: any[][] = draw.rounds as any[][];
      let matchFound = false;

      for (const round of rounds) {
        for (const match of round) {
          if (match.matchId === matchId) {
            match.winnerId = winnerId;
            match.status = "COMPLETED";
            matchFound = true;
            break;
          }
        }
        if (matchFound) break;
      }

      if (matchFound) {
        await prisma.tournamentDraw.update({
          where: { id: draw.id },
          data: { rounds: rounds as any }
        });
        updated = true;
        break;
      }
    }

    if (!updated) return res.status(404).json({ error: "Match not found" });
    return res.json({ message: "Match result saved successfully" });
  } catch (error) {
    console.error("Error saving match result:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateMatchState = async (req: Request, res: Response) => {
  const { id, matchId } = req.params;
  const { scoreA, scoreB, logs, timeLeft, status } = req.body;

  try {
    const draws = await prisma.tournamentDraw.findMany({ where: { tournamentId: id as string } });
    
    let updated = false;
    for (const draw of draws) {
      const rounds: any[][] = draw.rounds as any[][];
      let matchFound = false;

      for (const round of rounds) {
        for (const match of round) {
          if (match.matchId === matchId) {
            if (scoreA !== undefined) match.scoreA = scoreA;
            if (scoreB !== undefined) match.scoreB = scoreB;
            if (logs !== undefined) match.logs = logs;
            if (timeLeft !== undefined) match.timeLeft = timeLeft;
            if (status !== undefined) match.status = status;
            
            matchFound = true;
            break;
          }
        }
        if (matchFound) break;
      }

      if (matchFound) {
        await prisma.tournamentDraw.update({
          where: { id: draw.id },
          data: { rounds: rounds as any }
        });
        updated = true;
        break;
      }
    }

    if (!updated) return res.status(404).json({ error: "Match not found" });
    return res.json({ message: "Match state updated successfully" });
  } catch (error) {
    console.error("Error updating match state:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
