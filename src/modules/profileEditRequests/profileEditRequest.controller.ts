import type { Response } from "express";
import prisma from "../../database/prisma.js";
import type { AuthRequest } from "../../middleware/authMiddleware.js";
import { sendNotificationToUser } from "../../socket/socket.js";

const allowedFields = new Set([
  "Personal details",
  "Contact details",
  "Address",
  "Physical details",
  "Judo details",
  "Profile photo",
]);

export async function createProfileEditRequest(req: AuthRequest, res: Response) {
  try {
    if (req.user?.role !== "PLAYER") return res.status(403).json({ error: "Only players can request profile edits." });

    const student = await prisma.student.findUnique({
      where: { id: req.user.userId },
      select: { id: true, fullName: true, coachId: true },
    });
    if (!student) return res.status(404).json({ error: "Player profile not found." });
    if (!student.coachId) return res.status(400).json({ error: "An assigned coach is required before requesting a profile edit." });

    const requestedFields: string[] = Array.isArray(req.body.requestedFields)
      ? Array.from(new Set<string>(req.body.requestedFields.filter((field: unknown): field is string => typeof field === "string" && allowedFields.has(field))))
      : [];
    const reason = typeof req.body.reason === "string" ? req.body.reason.trim() : "";
    if (requestedFields.length === 0) return res.status(400).json({ error: "Select at least one profile field." });
    if (reason.length < 10 || reason.length > 500) return res.status(400).json({ error: "Reason must contain between 10 and 500 characters." });

    const existing = await prisma.profileEditRequest.findFirst({
      where: { studentId: student.id, status: { in: ["PENDING", "APPROVED"] } },
      orderBy: { createdAt: "desc" },
    });
    if (existing) return res.status(409).json({ error: "A profile-edit request is already pending or approved.", ...existing });

    const request = await prisma.profileEditRequest.create({
      data: { studentId: student.id, coachId: student.coachId, requestedFields, reason },
    });

    sendNotificationToUser(student.coachId, {
      type: "PROFILE_EDIT_REQUEST",
      id: request.id,
      requestId: request.id,
      message: `${student.fullName} requested permission to edit their profile.`,
      actionUrl: "/dashboard/member#profile-edit-requests",
      createdAt: request.createdAt,
    });
    return res.status(201).json(request);
  } catch (error) {
    console.error("Create profile edit request error:", error);
    return res.status(500).json({ error: "Unable to create the profile-edit request." });
  }
}

export async function getMyProfileEditRequest(req: AuthRequest, res: Response) {
  try {
    if (req.user?.role !== "PLAYER") return res.status(403).json({ error: "Only players can view this request." });
    const request = await prisma.profileEditRequest.findFirst({
      where: { studentId: req.user.userId, status: { in: ["PENDING", "APPROVED"] } },
      orderBy: { createdAt: "desc" },
    });
    return res.json(request);
  } catch (error) {
    console.error("Get player profile edit request error:", error);
    return res.status(500).json({ error: "Unable to load the profile-edit request." });
  }
}

export async function getCoachProfileEditRequests(req: AuthRequest, res: Response) {
  try {
    if (req.user?.role !== "COACH") return res.status(403).json({ error: "Only coaches can view player edit requests." });
    const requests = await prisma.profileEditRequest.findMany({
      where: { coachId: req.user.userId },
      include: { student: { select: { id: true, fullName: true, tempId: true, permanentId: true } } },
      orderBy: { createdAt: "desc" },
    });
    return res.json(requests.map(({ student, ...request }) => ({ ...request, player: student })));
  } catch (error) {
    console.error("Get coach profile edit requests error:", error);
    return res.status(500).json({ error: "Unable to load player edit requests." });
  }
}

export async function reviewProfileEditRequest(req: AuthRequest, res: Response) {
  try {
    if (req.user?.role !== "COACH") return res.status(403).json({ error: "Only coaches can review player edit requests." });
    const action = typeof req.params.action === "string" ? req.params.action : "";
    const requestId = typeof req.params.id === "string" ? req.params.id : "";
    if (action !== "approve" && action !== "reject") return res.status(400).json({ error: "Invalid review action." });

    const existing = await prisma.profileEditRequest.findUnique({ where: { id: requestId } });
    if (!existing) return res.status(404).json({ error: "Profile-edit request not found." });
    if (existing.coachId !== req.user.userId) return res.status(403).json({ error: "This request belongs to another coach." });
    if (existing.status !== "PENDING") return res.status(409).json({ error: "This request has already been reviewed." });

    const request = await prisma.profileEditRequest.update({
      where: { id: existing.id },
      data: { status: action === "approve" ? "APPROVED" : "REJECTED", reviewedAt: new Date() },
    });
    sendNotificationToUser(existing.studentId, {
      type: "PROFILE_EDIT_REQUEST_REVIEWED",
      id: request.id,
      requestId: request.id,
      message: `Your profile-edit request was ${action === "approve" ? "approved" : "rejected"}.`,
      actionUrl: "/dashboard/player",
      createdAt: request.updatedAt,
    });
    return res.json(request);
  } catch (error) {
    console.error("Review profile edit request error:", error);
    return res.status(500).json({ error: "Unable to review the profile-edit request." });
  }
}