import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import { sendNotificationToUser } from "../lib/ws.js";

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

  const { title, dateFrom, dateTo, location, description, entryFee, totalSlots, ageFrom, ageTo, gender, allowBPL, beltEligibility, level } = req.body;

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
        ageFrom: Number(ageFrom || 0),
        ageTo: Number(ageTo || 100),
        gender: gender || "BOTH",
        allowBPL: Boolean(allowBPL),
        beltEligibility: beltEligibility || null,
        level,
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
          select: { id: true, fullName: true, permanentId: true, tempId: true, email: true, gender: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return res.json(registrations);
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
      include: { player: { select: { id: true, fullName: true } } },
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

  const { title, dateFrom, dateTo, location, description, entryFee, totalSlots, ageFrom, ageTo, gender, allowBPL, beltEligibility, level } = req.body;

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
        ...(ageFrom !== undefined && { ageFrom: Number(ageFrom) }),
        ...(ageTo !== undefined && { ageTo: Number(ageTo) }),
        ...(gender && { gender }),
        ...(allowBPL !== undefined && { allowBPL: Boolean(allowBPL) }),
        ...(beltEligibility !== undefined && { beltEligibility }),
        ...(level && { level }),
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
      where: { clubId: player.clubId, status: "APPROVED" },
      include: {
        _count: { select: { registrations: true } },
        registrations: {
          where: { playerId: userId },
          select: { id: true, status: true, isPaid: true },
        },
      },
      orderBy: { date: "asc" },
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

// ─── PLAYER: Create Tournament Payment Order ────────────────────────────────
export const createTournamentPaymentOrder = async (req: Request, res: Response) => {
  const { userId, role } = (req as any).user;
  const { tournamentId, height, weight } = req.body;

  if (role !== "PLAYER" && role !== "STUDENT") {
    return res.status(403).json({ error: "Only players can register for tournaments" });
  }

  if (!tournamentId) {
    return res.status(400).json({ error: "tournamentId is required" });
  }

  try {
    const player = await prisma.student.findUnique({
      where: { id: userId },
      select: { clubId: true, isPaid: true, isBPL: true },
    });

    if (!player) return res.status(404).json({ error: "Player not found" });
    if (!player.isPaid && !player.isBPL) {
      return res.status(403).json({ error: "Complete your membership payment before joining a tournament" });
    }

    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });
    if (tournament.clubId !== player.clubId) {
      return res.status(403).json({ error: "This tournament is not for your club" });
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
        },
      });

      if (tournament.clubId) {
        sendNotificationToUser(tournament.clubId, {
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
  const { tournamentId, razorpay_payment_id, razorpay_order_id, razorpay_signature, height, weight } = req.body;

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
      },
    });

    // Notify the club that a new player registered
    if (tournament.clubId) {
      sendNotificationToUser(tournament.clubId, {
        type: "NEW_TOURNAMENT_REGISTRATION",
        message: `A player has paid and registered for your tournament "${tournament.title}". Review and approve in Tournaments.`,
        tournamentId,
        createdAt: new Date().toISOString(),
      });
    }

    return res.status(201).json({
      message: "Payment verified. Registration submitted for club approval.",
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
    if (notifyId) {
      const customMsg = message?.trim();
      if (dataToUpdate.status === "APPROVED") {
        sendNotificationToUser(notifyId, {
          type: "TOURNAMENT_APPROVED",
          message: customMsg || `Your tournament "${tournament.title}" has been approved and is now live!`,
          tournamentId: id,
          createdAt: new Date().toISOString(),
        });
      } else {
        sendNotificationToUser(notifyId, {
          type: "TOURNAMENT_REJECTED",
          message: customMsg || `Your tournament "${tournament.title}" was rejected. Reason: ${rejectionText}`,
          tournamentId: id,
          createdAt: new Date().toISOString(),
        });
      }
    }

    return res.json({ message: `Tournament ${status.toLowerCase()} successfully`, tournament: updated });
  } catch (error) {
    console.error("Error approving tournament:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ─── ADMIN: Send Reply to Tournament Creator ─────────────────────────────────
export const sendTournamentReply = async (req: Request, res: Response) => {
  const { role } = (req as any).user;
  const id = req.params.id as string;
  const { message } = req.body;

  const allowed = ["SUPER_ADMIN", "CEO", "DISTRICT_PRESIDENT", "DISTRICT_SECRETARY",
    "STATE_PRESIDENT", "STATE_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY"];
  if (!allowed.includes(role)) return res.status(403).json({ error: "Access denied" });
  if (!message?.trim()) return res.status(400).json({ error: "Message is required" });

  try {
    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });

    const notifyId = tournament.clubId || tournament.officialId;
    if (notifyId) {
      sendNotificationToUser(notifyId, {
        type: "TOURNAMENT_APPROVED",
        message: message.trim(),
        tournamentId: id,
        createdAt: new Date().toISOString(),
      });
    }

    return res.json({ message: "Reply sent successfully" });
  } catch (error) {
    console.error("Error sending tournament reply:", error);
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

// ─── ADMIN/CLUB: Save Tournament Draw ────────────────────────────────────────
export const saveTournamentDraw = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { ageGroup, gender, weightCategory, rounds } = req.body;

  try {
    const draw = await prisma.tournamentDraw.upsert({
      where: {
        tournamentId_ageGroup_gender_weightCategory: {
          tournamentId: id,
          ageGroup,
          gender,
          weightCategory,
        }
      },
      update: {
        rounds
      },
      create: {
        tournamentId: id,
        ageGroup,
        gender,
        weightCategory,
        rounds
      }
    });
    return res.json({ message: "Draw saved successfully", draw });
  } catch (error) {
    console.error("Error saving draw:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
