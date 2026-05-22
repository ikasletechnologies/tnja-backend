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

  if (role !== "CLUB") {
    return res.status(403).json({ error: "Only clubs can create tournaments" });
  }

  const { title, date, location, description, entryFee, totalSlots, ageGroup, weightCategory } = req.body;

  if (!title || !date || !location || !description || !entryFee || !totalSlots) {
    return res.status(400).json({ error: "title, date, location, description, entryFee, and totalSlots are required" });
  }

  try {
    const tournament = await prisma.tournament.create({
      data: {
        title,
        date: new Date(date),
        location,
        description,
        entryFee: Number(entryFee),
        totalSlots: Number(totalSlots),
        ageGroup: ageGroup || null,
        weightCategory: weightCategory || null,
        clubId: userId,
      },
    });

    // Notify all paid players of this club who are currently online
    const paidPlayers = await prisma.student.findMany({
      where: { clubId: userId, isPaid: true, status: "APPROVED" },
      select: { id: true, fullName: true },
    });

    for (const player of paidPlayers) {
      sendNotificationToUser(player.id, {
        type: "NEW_TOURNAMENT",
        message: `Your club has created a new tournament: "${title}" on ${new Date(date).toLocaleDateString("en-IN")}. Entry fee: ₹${entryFee}. Go to Tournaments to register.`,
        tournamentId: tournament.id,
        createdAt: new Date().toISOString(),
      });
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

  if (role !== "CLUB") {
    return res.status(403).json({ error: "Access denied" });
  }

  try {
    const tournaments = await prisma.tournament.findMany({
      where: { clubId: userId },
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

// ─── CLUB: Get Registrations for a Tournament ────────────────────────────────
export const getTournamentRegistrations = async (req: Request, res: Response) => {
  const { userId, role } = (req as any).user;
  const { id } = req.params;

  if (role !== "CLUB") {
    return res.status(403).json({ error: "Access denied" });
  }

  try {
    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });
    if (tournament.clubId !== userId) return res.status(403).json({ error: "This tournament does not belong to your club" });

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

// ─── CLUB: Approve or Reject a Registration ──────────────────────────────────
export const updateRegistrationStatus = async (req: Request, res: Response) => {
  const { userId, role } = (req as any).user;
  const { id: tournamentId, regId } = req.params;
  const { status } = req.body;

  if (role !== "CLUB") {
    return res.status(403).json({ error: "Access denied" });
  }

  if (!["APPROVED", "REJECTED"].includes(status)) {
    return res.status(400).json({ error: "Status must be APPROVED or REJECTED" });
  }

  try {
    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });
    if (tournament.clubId !== userId) return res.status(403).json({ error: "This tournament does not belong to your club" });

    const registration = await prisma.tournamentRegistration.update({
      where: { id: regId },
      data: { status },
      include: { player: { select: { id: true, fullName: true } } },
    });

    // Notify the player of the decision
    sendNotificationToUser(registration.player.id, {
      type: "TOURNAMENT_REG_UPDATE",
      message: status === "APPROVED"
        ? `Your registration for "${tournament.title}" has been approved by the club!`
        : `Your registration for "${tournament.title}" has been rejected by the club.`,
      tournamentId,
      createdAt: new Date().toISOString(),
    });

    return res.json({ message: `Registration ${status.toLowerCase()} successfully`, registration });
  } catch (error) {
    console.error("Error updating registration status:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ─── CLUB: Update Tournament ─────────────────────────────────────────────────
export const updateTournament = async (req: Request, res: Response) => {
  const { userId, role } = (req as any).user;
  const { id } = req.params;

  if (role !== "CLUB") {
    return res.status(403).json({ error: "Only clubs can update tournaments" });
  }

  const { title, date, location, description, entryFee, totalSlots, ageGroup, weightCategory } = req.body;

  try {
    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });
    if (tournament.clubId !== userId) return res.status(403).json({ error: "This tournament does not belong to your club" });

    const updated = await prisma.tournament.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(date && { date: new Date(date) }),
        ...(location && { location }),
        ...(description && { description }),
        ...(entryFee !== undefined && { entryFee: Number(entryFee) }),
        ...(totalSlots !== undefined && { totalSlots: Number(totalSlots) }),
        ageGroup: ageGroup || null,
        weightCategory: weightCategory || null,
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
  const { id } = req.params;

  if (role !== "CLUB") {
    return res.status(403).json({ error: "Only clubs can delete tournaments" });
  }

  try {
    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament) return res.status(404).json({ error: "Tournament not found" });
    if (tournament.clubId !== userId) return res.status(403).json({ error: "This tournament does not belong to your club" });

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
      where: { clubId: player.clubId },
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

// ─── PLAYER: Create Razorpay Payment Order ───────────────────────────────────
export const createTournamentPaymentOrder = async (req: Request, res: Response) => {
  const { userId, role } = (req as any).user;
  const { tournamentId } = req.body;

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
  const { tournamentId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

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
      },
    });

    // Notify the club that a new player registered
    sendNotificationToUser(tournament.clubId, {
      type: "NEW_TOURNAMENT_REGISTRATION",
      message: `A player has paid and registered for your tournament "${tournament.title}". Review and approve in Tournaments.`,
      tournamentId,
      createdAt: new Date().toISOString(),
    });

    return res.status(201).json({
      message: "Payment verified. Registration submitted for club approval.",
      registration,
    });
  } catch (error) {
    console.error("Error verifying tournament payment:", error);
    return res.status(500).json({ error: "Payment verification failed" });
  }
};
