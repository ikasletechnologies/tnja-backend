import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import { sendNotificationToUser } from "../lib/ws.js";
import { sendEventRegistrationEmail, sendNewTournamentAnnouncement } from "../lib/mailer.js";

// ─── HELPER: Calculate Age Group ────────────────────────────────────────────
const getAgeGroup = (age: number): string => {
  if (age <= 14) return "Sub-Junior (10-14 yrs)";
  if (age <= 17) return "Cadet (15-17 yrs)";
  if (age <= 20) return "Junior (18-20 yrs)";
  if (age < 35) return "Senior (21-34 yrs)";
  return "Veteran (35+ yrs)";
};

// ─── HELPER: Get Weight Category ────────────────────────────────────────────
const getWeightCategory = (weightKg: number): string => {
  if (weightKg <= 45) return "45kg";
  if (weightKg <= 50) return "50kg";
  if (weightKg <= 55) return "55kg";
  if (weightKg <= 60) return "60kg";
  if (weightKg <= 66) return "66kg";
  if (weightKg <= 73) return "73kg";
  if (weightKg <= 81) return "81kg";
  return "90kg+";
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

  const { title, dateFrom, dateTo, location, description, entryFee, totalSlots, numberOfMats, ageFrom, ageTo, gender, allowBPL, beltEligibility, level, zoneId } = req.body;

  if (!title || !dateFrom || !location || !description || entryFee === undefined || !totalSlots || !level) {
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
        totalSlots: Number(totalSlots),
        numberOfMats: numberOfMats ? Number(numberOfMats) : 1,
        ageFrom: Number(ageFrom || 0),
        ageTo: Number(ageTo || 100),
        gender: gender || "BOTH",
        allowBPL: Boolean(allowBPL),
        beltEligibility: beltEligibility || null,
        level,
        zoneId: zoneId || null,
        clubId: isClub ? userId : null,
        officialId: isOfficial ? userId : null,
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

// ─── CLUB: Get My Tournaments ────────────────────────────────────────────────
export const getClubTournaments = async (req: Request, res: Response) => {
  const { userId, role } = (req as any).user;

  const isClub = role === "CLUB";
  const isOfficial = ["DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY", "CEO", "SUPER_ADMIN"].includes(role);

  if (!isClub && !isOfficial) {
    return res.status(403).json({ error: "Access denied" });
  }

  try {
    const whereClause = isClub ? { clubId: userId } : { officialId: userId };

    const tournaments = await prisma.tournament.findMany({
      where: whereClause,
      include: {
        _count: { select: { registrations: true } },
      },
      orderBy: { date: "asc" },
    });

    const result = tournaments.map((t) => ({
      ...t,
      registrationCount: t._count.registrations,
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
        club: { select: { name: true, district: { select: { name: true } } } }
      },
      orderBy: { date: "desc" },
    });

    const result = tournaments.map((t) => ({
      ...t,
      registrationCount: t._count.registrations,
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
    if (tournament.clubId !== userId && tournament.officialId !== userId) return res.status(403).json({ error: "This tournament does not belong to you" });

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

    const registration = await prisma.tournamentRegistration.update({
      where: { id: regId },
      data: { status },
      include: { player: { select: { id: true, fullName: true, email: true } } },
    });

    const defaultMsg = status === "APPROVED"
      ? `Your registration for "${tournament.title}" has been approved by the club!`
      : `Your registration for "${tournament.title}" has been rejected by the club.`;

    const finalMsg = message?.trim() || defaultMsg;

    // Save message to DB as a chat record
    await prisma.tournamentRegistrationMessage.create({
      data: {
        registrationId: regId,
        senderRole: role,
        senderName: "Club",
        message: `[${status}] ${finalMsg}`,
      },
    });

    sendNotificationToUser(registration.playerId, {
      type: "TOURNAMENT_REG_UPDATE",
      message: finalMsg,
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

  const { title, dateFrom, dateTo, location, description, entryFee, totalSlots, numberOfMats, ageFrom, ageTo, gender, allowBPL, beltEligibility, level, zoneId } = req.body;

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
        ...(totalSlots !== undefined && { totalSlots: Number(totalSlots) }),
        ...(numberOfMats !== undefined && { numberOfMats: Number(numberOfMats) }),
        ...(ageFrom !== undefined && { ageFrom: Number(ageFrom) }),
        ...(ageTo !== undefined && { ageTo: Number(ageTo) }),
        ...(gender && { gender }),
        ...(allowBPL !== undefined && { allowBPL: Boolean(allowBPL) }),
        ...(beltEligibility !== undefined && { beltEligibility }),
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
  const { tournamentId, height, weight, coachId } = req.body;

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

    // Check slots
    const regCount = await prisma.tournamentRegistration.count({ where: { tournamentId } });
    if (regCount >= tournament.totalSlots) {
      return res.status(400).json({ error: "Tournament is full" });
    }

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
          status: "PENDING",
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
        const ageGroup = getAgeGroup(playerData.age);
        const weightCategory = getWeightCategory(Number(weight));
        const playerGender = playerData.gender === "FEMALE" ? "FEMALE" : "MALE";

        // Get tournament's gender (could be MALE, FEMALE, or BOTH)
        const tournamentGender = tournament.gender === "BOTH" ? playerGender : tournament.gender;

        await createOrGetDraw(tournamentId, tournamentGender, ageGroup, weightCategory, playerData.age);
      }

      const freOrganiserId = tournament.clubId || tournament.officialId;
      if (freOrganiserId) {
        sendNotificationToUser(freOrganiserId, {
          type: "NEW_TOURNAMENT_REGISTRATION",
          message: `A player has registered for your tournament "${tournament.title}". Review and approve in Tournaments.`,
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
  const { tournamentId, razorpay_payment_id, razorpay_order_id, razorpay_signature, height, weight, coachId } = req.body;

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

    // Check slots again before creating
    const regCount = await prisma.tournamentRegistration.count({ where: { tournamentId } });
    if (regCount >= tournament.totalSlots) {
      return res.status(400).json({ error: "Tournament is now full" });
    }

    const registration = await prisma.tournamentRegistration.create({
      data: {
        tournamentId,
        playerId: userId,
        status: "PENDING",
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
      const ageGroup = getAgeGroup(playerData.age);
      const weightCategory = getWeightCategory(Number(weight));
      const playerGender = playerData.gender === "FEMALE" ? "FEMALE" : "MALE";

      // Get tournament's gender (could be MALE, FEMALE, or BOTH)
      const tournamentGender = tournament.gender === "BOTH" ? playerGender : tournament.gender;

      await createOrGetDraw(tournamentId, tournamentGender, ageGroup, weightCategory, playerData.age);
    }

    // Notify the organiser (club or official) that a new player registered
    const organiserId = tournament.clubId || tournament.officialId;
    if (organiserId) {
      sendNotificationToUser(organiserId, {
        type: "NEW_TOURNAMENT_REGISTRATION",
        message: `A player has paid and registered for your tournament "${tournament.title}". Review and approve in Tournaments.`,
        tournamentId,
        createdAt: new Date().toISOString(),
      });
    }

    return res.status(201).json({
      message: "Payment verified. Registration submitted for approval.",
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
        club: { select: { name: true, district: { select: { name: true } } } }
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(tournaments);
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
        club: { select: { name: true, district: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(tournaments);
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
      dataToUpdate.status = "APPROVED";
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

  if (!isClub && !isOfficial) {
    return res.status(403).json({ error: "Only clubs and officials can save draws" });
  }

  if (!ageGroup || exactAge === undefined || !gender || !weightCategory || !rounds) {
    return res.status(400).json({ error: "Missing required draw parameters" });
  }

  try {
    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });
    if (tournament.clubId !== userId && tournament.officialId !== userId) {
      return res.status(403).json({ error: "This tournament does not belong to you" });
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
