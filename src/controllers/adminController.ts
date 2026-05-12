import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { sendApprovalEmail, sendRejectionEmail } from "../lib/mailer.js";

const generatePermanentId = (prefix: string) => {
  return `${prefix}-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
};

/** Generate a readable 8-char password and return both raw + hashed */
const generatePassword = async () => {
  const raw = crypto.randomBytes(4).toString("hex"); // e.g. "a3f91bc2"
  const hashed = await bcrypt.hash(raw, 10);
  return { raw, hashed };
};

// ──────────────────────────────────────────────────────────────────────────────
// GET  /api/applications/pending          – list pending applications by type
// ──────────────────────────────────────────────────────────────────────────────
export const getPendingApplications = async (req: Request, res: Response) => {
  const type = (req.query.type as string || "").toUpperCase();

  try {
    if (type === "STUDENT") {
      const students = await prisma.student.findMany({
        where: { status: "PENDING" },
        include: { district: true, taluk: true, club: true },
        orderBy: { createdAt: "desc" },
      });
      return res.json({ type: "STUDENT", data: students });
    }

    if (type === "COACH") {
      const coaches = await prisma.coachReferee.findMany({
        where: { status: "PENDING" },
        include: { district: true, taluk: true, club: true },
        orderBy: { createdAt: "desc" },
      });
      return res.json({ type: "COACH", data: coaches });
    }

    if (type === "CLUB") {
      const clubs = await prisma.club.findMany({
        where: { status: "PENDING" },
        include: { district: true, taluk: true },
        orderBy: { createdAt: "desc" },
      });
      return res.json({ type: "CLUB", data: clubs });
    }

    if (type === "MEMBER") {
      const members = await prisma.member.findMany({
        where: { status: "PENDING" },
        include: { district: true, taluk: true },
        orderBy: { createdAt: "desc" },
      });
      return res.json({ type: "MEMBER", data: members });
    }

    // Return all pending counts if no type specified
    const [studentCount, coachCount, memberCount, clubCount] = await Promise.all([
      prisma.student.count({ where: { status: "PENDING" } }),
      prisma.coachReferee.count({ where: { status: "PENDING" } }),
      prisma.member.count({ where: { status: "PENDING" } }),
      prisma.club.count({ where: { status: "PENDING" } }),
    ]);

    return res.json({
      counts: {
        STUDENT: studentCount,
        COACH: coachCount,
        MEMBER: memberCount,
        CLUB: clubCount,
      },
    });
  } catch (error) {
    console.error("[getPendingApplications]", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /api/application/status   – approve or reject any registration type
// ──────────────────────────────────────────────────────────────────────────────
export const updateApplicationStatus = async (req: Request, res: Response) => {
  const { id, type, status, remark } = req.body;
  // type: 'student' | 'coach' | 'club' | 'member'
  // status: 'APPROVED' | 'REJECTED'

  try {
    // ── STUDENT ──────────────────────────────────────────────────────────────
    if (type === "student") {
      const student = await prisma.student.findUnique({ where: { id } });
      if (!student) return res.status(404).json({ error: "Student not found" });

      const updateData: any = { status, rejectionRemark: remark || null };

      if (status === "APPROVED") {
        if (student.isBPL || student.isPaid) {
          updateData.permanentId = generatePermanentId("STU");

          const { raw, hashed } = await generatePassword();
          updateData.password = hashed;

          const updated = await prisma.student.update({ where: { id }, data: updateData });

          // Send approval email
          try {
            await sendApprovalEmail({
              toEmail: student.email,
              toName: student.fullName,
              tempId: student.tempId,
              permanentId: updated.permanentId!,
              password: raw,
              role: "Student",
            });
          } catch (mailErr) {
            console.error("[Mailer] Failed to send student approval email:", mailErr);
          }

          return res.json({ message: "Student APPROVED. Email sent.", data: updated });
        } else {
          return res.status(400).json({ error: "Payment required for non-BPL students before approval" });
        }
      }

      if (status === "REJECTED") {
        const updated = await prisma.student.update({ where: { id }, data: updateData });
        try {
          await sendRejectionEmail({
            toEmail: student.email,
            toName: student.fullName,
            role: "Student",
            remark: remark || "No reason provided.",
          });
        } catch (mailErr) {
          console.error("[Mailer] Failed to send student rejection email:", mailErr);
        }
        return res.json({ message: "Student REJECTED. Email sent.", data: updated });
      }
    }

    // ── COACH ─────────────────────────────────────────────────────────────────
    if (type === "coach") {
      const coach = await prisma.coachReferee.findUnique({ where: { id } });
      if (!coach) return res.status(404).json({ error: "Coach not found" });

      const updateData: any = { status, rejectionRemark: remark || null };

      if (status === "APPROVED") {
        updateData.permanentId = generatePermanentId("COA");

        const { raw, hashed } = await generatePassword();
        updateData.password = hashed;

        const updated = await prisma.coachReferee.update({ where: { id }, data: updateData });

        try {
          await sendApprovalEmail({
            toEmail: coach.email,
            toName: coach.fullName,
            tempId: coach.tempId,
            permanentId: updated.permanentId!,
            password: raw,
            role: "Coach",
          });
        } catch (mailErr) {
          console.error("[Mailer] Failed to send coach approval email:", mailErr);
        }

        return res.json({ message: "Coach APPROVED. Email sent.", data: updated });
      }

      if (status === "REJECTED") {
        const updated = await prisma.coachReferee.update({ where: { id }, data: updateData });
        try {
          await sendRejectionEmail({
            toEmail: coach.email,
            toName: coach.fullName,
            role: "Coach",
            remark: remark || "No reason provided.",
          });
        } catch (mailErr) {
          console.error("[Mailer] Failed to send coach rejection email:", mailErr);
        }
        return res.json({ message: "Coach REJECTED. Email sent.", data: updated });
      }
    }

    // ── MEMBER ────────────────────────────────────────────────────────────────
    if (type === "member") {
      const member = await prisma.member.findUnique({ where: { id } });
      if (!member) return res.status(404).json({ error: "Member not found" });

      const updateData: any = { status, rejectionRemark: remark || null };

      if (status === "APPROVED") {
        updateData.permanentId = generatePermanentId("MEM");

        const { raw, hashed } = await generatePassword();
        updateData.password = hashed;

        const updated = await prisma.member.update({ where: { id }, data: updateData });

        try {
          await sendApprovalEmail({
            toEmail: member.email,
            toName: member.fullName,
            tempId: member.tempId,
            permanentId: updated.permanentId!,
            password: raw,
            role: "Member",
          });
        } catch (mailErr) {
          console.error("[Mailer] Failed to send member approval email:", mailErr);
        }

        return res.json({ message: "Member APPROVED. Email sent.", data: updated });
      }

      if (status === "REJECTED") {
        const updated = await prisma.member.update({ where: { id }, data: updateData });
        try {
          await sendRejectionEmail({
            toEmail: member.email,
            toName: member.fullName,
            role: "Member",
            remark: remark || "No reason provided.",
          });
        } catch (mailErr) {
          console.error("[Mailer] Failed to send member rejection email:", mailErr);
        }
        return res.json({ message: "Member REJECTED. Email sent.", data: updated });
      }
    }

    // ── CLUB ──────────────────────────────────────────────────────────────────
    if (type === "club") {
      const club = await prisma.club.findUnique({ where: { id } });
      if (!club) return res.status(404).json({ error: "Club not found" });

      const updateData: any = { status, rejectionRemark: remark || null };

      if (status === "APPROVED") {
        updateData.permanentId = generatePermanentId("CLB");
        const { raw, hashed } = await generatePassword();
        updateData.password = hashed;

        const updated = await prisma.club.update({ where: { id }, data: updateData });

        try {
          await sendApprovalEmail({
            toEmail: club.email,
            toName: club.name,
            tempId: club.id,
            permanentId: updated.permanentId!,
            password: raw,
            role: "Club",
          });
        } catch (mailErr) {
          console.error("[Mailer] Failed to send club approval email:", mailErr);
        }

        return res.json({ message: "Club APPROVED. Email sent.", data: updated });
      }

      if (status === "REJECTED") {
        const updated = await prisma.club.update({ where: { id }, data: updateData });
        try {
          await sendRejectionEmail({
            toEmail: club.email,
            toName: club.name,
            role: "Club",
            remark: remark || "No reason provided.",
          });
        } catch (mailErr) {
          console.error("[Mailer] Failed to send club rejection email:", mailErr);
        }
        return res.json({ message: "Club REJECTED. Email sent.", data: updated });
      }
    }


    return res.status(400).json({ error: "Invalid application type" });

  } catch (error) {
    console.error("[updateApplicationStatus]", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/application/:tempId  – get full details of an application
// ──────────────────────────────────────────────────────────────────────────────
export const getApplicationDetails = async (req: Request, res: Response) => {
  const tempId = req.params.tempId as string;

  try {
    const student = await prisma.student.findUnique({
      where: { tempId },
      include: { district: true, taluk: true, club: true },
    });
    if (student) return res.json({ type: "student", data: student });

    const coach = await prisma.coachReferee.findUnique({
      where: { tempId },
      include: { district: true, taluk: true, club: true },
    });
    if (coach) return res.json({ type: "coach", data: coach });

    const member = await prisma.member.findUnique({
      where: { tempId },
      include: { district: true, taluk: true },
    });
    if (member) return res.json({ type: "member", data: member });

    return res.status(404).json({ error: "Application not found with this Temporary ID" });
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/admin/stats  – get counts for the dashboard
// ──────────────────────────────────────────────────────────────────────────────
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const [
      studentCount,
      coachCount,
      memberCount,
      clubCount,
      pendingStudents,
      pendingCoaches,
      pendingMembers,
      pendingClubs,
    ] = await Promise.all([
      prisma.student.count(),
      prisma.coachReferee.count(),
      prisma.member.count(),
      prisma.club.count(),
      prisma.student.count({ where: { status: "PENDING" } }),
      prisma.coachReferee.count({ where: { status: "PENDING" } }),
      prisma.member.count({ where: { status: "PENDING" } }),
      prisma.club.count({ where: { status: "PENDING" } }),
    ]);

    // Get recent 5 pending across all types
    const [s, c, m, cl] = await Promise.all([
      prisma.student.findMany({ where: { status: "PENDING" }, take: 5, orderBy: { createdAt: "desc" } }),
      prisma.coachReferee.findMany({ where: { status: "PENDING" }, take: 5, orderBy: { createdAt: "desc" } }),
      prisma.member.findMany({ where: { status: "PENDING" }, take: 5, orderBy: { createdAt: "desc" } }),
      prisma.club.findMany({ where: { status: "PENDING" }, take: 5, orderBy: { createdAt: "desc" } }),
    ]);

    const recent = [
      ...s.map(i => ({ name: i.fullName, type: "Player", createdAt: i.createdAt })),
      ...c.map(i => ({ name: i.fullName, type: "Coach", createdAt: i.createdAt })),
      ...m.map(i => ({ name: i.fullName, type: "Member", createdAt: i.createdAt })),
      ...cl.map(i => ({ name: i.name, type: "Club", createdAt: i.createdAt })),
    ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);

    return res.json({
      counts: {
        STUDENT: studentCount,
        COACH: coachCount,
        MEMBER: memberCount,
        CLUB: clubCount,
      },
      pending: {
        STUDENT: pendingStudents,
        COACH: pendingCoaches,
        MEMBER: pendingMembers,
        CLUB: pendingClubs,
        total: pendingStudents + pendingCoaches + pendingMembers + pendingClubs,
      },
      recentApprovals: recent,
    });
  } catch (error) {
    console.error("[getDashboardStats]", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

