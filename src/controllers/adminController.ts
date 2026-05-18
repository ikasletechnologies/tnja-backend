import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { sendApprovalEmail, sendRejectionEmail, sendPaymentRequestEmail } from "../lib/mailer.js";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

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
  const { role, districtId } = (req as any).user;

  try {
    console.log(`[getPendingApplications] User: ${role}, District: ${districtId}, Type: ${type}`);

    // Basic permissions: MEMBER can ONLY see STUDENT applications
    if (role === "MEMBER" && type !== "STUDENT" && type !== "") {
      return res.status(403).json({ error: "District Admins can only view player applications" });
    }

    // Common where clause for filtering
    const whereClause: any = { status: "PENDING" };
    
    // TEMPORARY: Logging the check but not enforcing district filter to debug
    const districtRestrictedRoles = [
      "MEMBER", 
      "DISTRICT_ADMIN", 
      "DISTRICT_PRESIDENT", 
      "DISTRICT_SECRETARY", 
      "ZONE_PRESIDENT", 
      "ZONE_SECRETARY", 
      "STATE_PRESIDENT", 
      "STATE_SECRETARY"
    ];

    if (districtRestrictedRoles.includes(role) && districtId) {
      console.log(`[DEBUG] Role ${role} has districtId: ${districtId}. Enforcing filter...`);
      whereClause.districtId = districtId;
    } else {
      console.log(`[DEBUG] No districtId found or role is Super Admin. Showing all.`);
    }

    if (type === "STUDENT") {
      console.log(`[DEBUG] Fetching students with whereClause:`, JSON.stringify(whereClause));
      const students = await prisma.student.findMany({
        where: whereClause,
        include: { district: true, taluk: true, club: true },
        orderBy: { createdAt: "desc" },
      });
      console.log(`[DEBUG] Found ${students.length} students`);
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
      prisma.student.count({ where: whereClause }),
      prisma.coachReferee.count({ where: whereClause }),
      prisma.member.count({ where: whereClause }),
      prisma.club.count({ where: whereClause }),
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
  const { role, districtId } = (req as any).user;
  // type: 'student' | 'coach' | 'club' | 'member'
  // status: 'APPROVED' | 'REJECTED'

  try {
    const districtRestrictedRoles = ["MEMBER", "DISTRICT_ADMIN", "DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY"];
    const auditor = role === "SUPER_ADMIN" ? "Super Admin" : null;
    let auditorInfo = auditor;

    if (role !== "SUPER_ADMIN") {
      const member = await prisma.member.findUnique({ where: { id: (req as any).user.userId } });
      auditorInfo = member ? `${member.fullName} (${role})` : role;
    }

    // Basic permissions: Standard MEMBER can ONLY update 'student' applications
    if (role === "MEMBER" && type !== "student") {
      return res.status(403).json({ error: "District Admins can only approve player applications" });
    }

    // ── STUDENT ──────────────────────────────────────────────────────────────
    if (type === "student") {
      const student = await prisma.student.findUnique({ where: { id } });
      if (!student) return res.status(404).json({ error: "Student not found" });

      if (districtRestrictedRoles.includes(role) && districtId && student.districtId !== districtId) {
        return res.status(403).json({ error: "You do not have permission to approve students outside your district" });
      }

      const updateData: any = { status, rejectionRemark: remark || null };

      if (status === "APPROVED") {
        updateData.approvedBy = auditorInfo;
        updateData.approvedAt = new Date();

        if (student.isBPL) {
          // BPL Students get approved immediately with permanent ID
          updateData.permanentId = generatePermanentId("STU");
          
          // Generate new password for final account (optional, keeping current is fine too but common to refresh)
          const { raw, hashed } = await generatePassword();
          updateData.password = hashed;
          updateData.mustChangePassword = true;
          updateData.isPaid = true; // BPL counts as paid/waived

          const updated = await prisma.student.update({ where: { id }, data: updateData });

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
            console.error("[Mailer] Failed to send BPL student approval email:", mailErr);
          }

          return res.json({ message: "BPL Student APPROVED. Credentials sent.", data: updated });
        } else {
          // Non-BPL Students: Approve but require payment
          const { raw, hashed } = await generatePassword();
          const updated = await prisma.student.update({ 
            where: { id }, 
            data: { 
              status: "APPROVED", 
              approvedBy: auditorInfo,
              approvedAt: new Date(),
              isPaid: false,
              password: hashed,
              mustChangePassword: false
            } 
          });

          // Send payment notification email with password
          try {
            await sendPaymentRequestEmail({
              toEmail: student.email,
              toName: student.fullName,
              tempId: student.tempId,
              password: raw,
              role: "Player"
            });
          } catch (mailErr) {
            console.error("[Mailer] Failed to send payment request email:", mailErr);
          }

          return res.json({ message: "Student application APPROVED. Payment required for Player ID.", data: updated });
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

      if (districtRestrictedRoles.includes(role) && districtId && coach.districtId !== districtId) {
        return res.status(403).json({ error: "You do not have permission to approve coaches outside your district" });
      }

      const updateData: any = { status, rejectionRemark: remark || null };

      if (status === "APPROVED") {
        const { raw, hashed } = await generatePassword();
        const updated = await prisma.coachReferee.update({ 
          where: { id }, 
          data: { 
            status: "APPROVED", 
            approvedBy: auditorInfo,
            approvedAt: new Date(),
            isPaid: false,
            password: hashed,
            mustChangePassword: false
          } 
        });

        try {
          await sendPaymentRequestEmail({
            toEmail: coach.email,
            toName: coach.fullName,
            tempId: coach.tempId,
            password: raw,
            role: "Coach"
          });
        } catch (mailErr) {
          console.error("[Mailer] Failed to send coach payment request email:", mailErr);
        }

        return res.json({ message: "Coach APPROVED. Payment required for Coach ID.", data: updated });
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

      if (districtRestrictedRoles.includes(role) && districtId && member.districtId !== districtId) {
        return res.status(403).json({ error: "You do not have permission to approve members outside your district" });
      }

      const updateData: any = { status, rejectionRemark: remark || null };

      if (status === "APPROVED") {
        const { raw, hashed } = await generatePassword();
        const updated = await prisma.member.update({ 
          where: { id }, 
          data: { 
            status: "APPROVED", 
            approvedBy: auditorInfo,
            approvedAt: new Date(),
            isPaid: false,
            password: hashed,
            mustChangePassword: false
          } 
        });

        try {
          await sendPaymentRequestEmail({
            toEmail: member.email,
            toName: member.fullName,
            tempId: member.tempId,
            password: raw,
            role: "Member"
          });
        } catch (mailErr) {
          console.error("[Mailer] Failed to send member payment request email:", mailErr);
        }

        return res.json({ message: "Member APPROVED. Payment required for Member ID.", data: updated });
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

      if (districtRestrictedRoles.includes(role) && districtId && club.districtId !== districtId) {
        return res.status(403).json({ error: "You do not have permission to approve clubs outside your district" });
      }

      const updateData: any = { status, rejectionRemark: remark || null };

      if (status === "APPROVED") {
        const { raw, hashed } = await generatePassword();
        const updated = await prisma.club.update({ 
          where: { id }, 
          data: { 
            status: "APPROVED", 
            approvedBy: auditorInfo,
            approvedAt: new Date(),
            isPaid: false,
            password: hashed,
            mustChangePassword: false
          } 
        });

        try {
          await sendPaymentRequestEmail({
            toEmail: club.email,
            toName: club.name,
            tempId: club.id, // Clubs use UUID as tempId
            password: raw,
            role: "Club"
          });
        } catch (mailErr) {
          console.error("[Mailer] Failed to send club payment request email:", mailErr);
        }

        return res.json({ message: "Club APPROVED. Payment required for Club ID.", data: updated });
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
  const { role, districtId } = (req as any).user;
  const filter: any = {};
  const districtRestrictedRoles = [
    "MEMBER", 
    "DISTRICT_ADMIN", 
    "DISTRICT_PRESIDENT", 
    "DISTRICT_SECRETARY", 
    "ZONE_PRESIDENT", 
    "ZONE_SECRETARY", 
    "STATE_PRESIDENT", 
    "STATE_SECRETARY"
  ];

  if (districtRestrictedRoles.includes(role) && districtId) {
    filter.districtId = districtId;
  }

  try {
    const pendingFilter = { ...filter, status: "PENDING" };

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
      prisma.student.count({ where: filter }),
      prisma.coachReferee.count({ where: filter }),
      prisma.member.count({ where: filter }),
      prisma.club.count({ where: filter }),
      prisma.student.count({ where: pendingFilter }),
      prisma.coachReferee.count({ where: pendingFilter }),
      prisma.member.count({ where: pendingFilter }),
      prisma.club.count({ where: pendingFilter }),
    ]);

    // Get recent 5 pending across all types
    const [s, c, m, cl] = await Promise.all([
      prisma.student.findMany({ where: pendingFilter, take: 5, orderBy: { createdAt: "desc" } }),
      prisma.coachReferee.findMany({ where: pendingFilter, take: 5, orderBy: { createdAt: "desc" } }),
      prisma.member.findMany({ where: pendingFilter, take: 5, orderBy: { createdAt: "desc" } }),
      prisma.club.findMany({ where: pendingFilter, take: 5, orderBy: { createdAt: "desc" } }),
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

export const createPaymentOrder = async (req: Request, res: Response) => {
  const { id, type, amount } = req.body;
  // type: 'student' | 'coach' | 'member' | 'club'
  
  try {
    let record: any = null;
    
    // Fetch Global Settings
    let settings = await prisma.globalSettings.findUnique({ where: { id: "GLOBAL" } });
    if (!settings) {
      // Initialize if not exists
      settings = await prisma.globalSettings.create({
        data: { id: "GLOBAL", playerFee: 500, coachFee: 1000, memberFee: 1000, clubFee: 1000 }
      });
    }

    let calculatedAmount = 0;
    if (type === "student") {
      record = await prisma.student.findUnique({ where: { id } });
      calculatedAmount = settings.playerFee;
    } else if (type === "coach") {
      record = await prisma.coachReferee.findUnique({ where: { id } });
      calculatedAmount = settings.coachFee;
    } else if (type === "member") {
      record = await prisma.member.findUnique({ where: { id } });
      calculatedAmount = settings.memberFee;
    } else if (type === "club") {
      record = await prisma.club.findUnique({ where: { id } });
      calculatedAmount = settings.clubFee;
    }

    if (!record) return res.status(404).json({ error: `${type} not found` });

    const options = {
      amount: calculatedAmount * 100, // amount in the smallest currency unit (paise)
      currency: "INR",
      receipt: `receipt_${record.tempId || record.id}`,
    };

    const order = await razorpay.orders.create(options);
    return res.json(order);
  } catch (error) {
    console.error("Razorpay order error:", error);
    return res.status(500).json({ error: "Failed to create payment order" });
  }
};

export const verifyPayment = async (req: Request, res: Response) => {
  const { id, type, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
  // type: 'student' | 'coach' | 'member' | 'club'

  try {
    let record: any = null;
    let updateFn: any = null;
    let prefix = "";
    let roleLabel: "Student" | "Coach" | "Member" | "Club" = "Student";

    if (type === "student") {
      record = await prisma.student.findUnique({ where: { id } });
      updateFn = prisma.student.update;
      prefix = "STU";
      roleLabel = "Student";
    } else if (type === "coach") {
      record = await prisma.coachReferee.findUnique({ where: { id } });
      updateFn = prisma.coachReferee.update;
      prefix = "COA";
      roleLabel = "Coach";
    } else if (type === "member") {
      record = await prisma.member.findUnique({ where: { id } });
      updateFn = prisma.member.update;
      prefix = "MEM";
      roleLabel = "Member";
    } else if (type === "club") {
      record = await prisma.club.findUnique({ where: { id } });
      updateFn = prisma.club.update;
      prefix = "CLB";
      roleLabel = "Club";
    }

    if (!record) return res.status(404).json({ error: `${type} application not found` });

    if (record.isPaid) {
      return res.status(400).json({ error: "Payment already processed" });
    }

    // Process success
    const permanentId = generatePermanentId(prefix);

    const updated = await updateFn({
      where: { id },
      data: {
        isPaid: true,
        permanentId,
        mustChangePassword: true
      }
    });

    try {
      await sendApprovalEmail({
        toEmail: record.email,
        toName: record.fullName || record.name,
        tempId: record.tempId || record.id,
        permanentId: updated.permanentId!,
        password: "Use your existing password",
        role: roleLabel,
      });
    } catch (mailErr) {
      console.error("Mail error after payment verification:", mailErr);
    }

    return res.json({ message: "Payment verified and ID issued", permanentId: updated.permanentId });

  } catch (error) {
    console.error("Payment verification error:", error);
    return res.status(500).json({ error: "Verification failed" });
  }
};

export const getGlobalSettings = async (req: Request, res: Response) => {
  try {
    let settings = await prisma.globalSettings.findUnique({ where: { id: "GLOBAL" } });
    if (!settings) {
      settings = await prisma.globalSettings.create({
        data: { id: "GLOBAL" }
      });
    }
    return res.json(settings);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch settings" });
  }
};

export const updateGlobalSettings = async (req: Request, res: Response) => {
  const { playerFee, coachFee, memberFee, clubFee } = req.body;
  try {
    const settings = await prisma.globalSettings.upsert({
      where: { id: "GLOBAL" },
      update: { playerFee, coachFee, memberFee, clubFee },
      create: { id: "GLOBAL", playerFee, coachFee, memberFee, clubFee }
    });
    return res.json({ message: "Settings updated successfully", settings });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update settings" });
  }
};
// ──────────────────────────────────────────────────────────────────────────────
// PATCH /api/member/promote      – promote a member to a specific role
// ──────────────────────────────────────────────────────────────────────────────
export const promoteMember = async (req: Request, res: Response) => {
  const { memberId, role } = req.body;
  const { role: requesterRole } = (req as any).user;

  if (requesterRole !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "Only Super Admin can promote members" });
  }

  const validRoles = [
    "MEMBER",
    "DISTRICT_PRESIDENT",
    "DISTRICT_SECRETARY",
    "ZONE_PRESIDENT",
    "ZONE_SECRETARY",
    "STATE_PRESIDENT",
    "STATE_SECRETARY"
  ];

  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: "Invalid role specified" });
  }

  try {
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) return res.status(404).json({ error: "Member not found" });

    const updated = await prisma.member.update({
      where: { id: memberId },
      data: { role: role as any }
    });

    return res.json({ message: `Member promoted to ${role} successfully`, data: updated });
  } catch (error) {
    console.error("[promoteMember]", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/admin/location-analytics – get detailed breakdown by taluk
// ──────────────────────────────────────────────────────────────────────────────
export const getLocationAnalytics = async (req: Request, res: Response) => {
  const { role, districtId } = (req as any).user;
  const filter: any = {};
  
  if (["DISTRICT_ADMIN", "DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY"].includes(role) && districtId) {
    filter.districtId = districtId;
  }

  try {
    const taluks = await prisma.taluk.findMany({
      where: filter.districtId ? { districtId: filter.districtId } : {},
      include: {
        students: { select: { id: true } },
        coaches: { select: { id: true } },
        members: { select: { id: true } },
        clubs: { select: { id: true } }
      }
    });

    const analytics = taluks.map(t => ({
      id: t.id,
      name: t.name,
      players: t.students.length,
      coaches: t.coaches.length,
      members: t.members.length,
      clubs: t.clubs.length,
      total: t.students.length + t.coaches.length + t.members.length + t.clubs.length
    })).sort((a, b) => b.total - a.total);

    return res.json(analytics);
  } catch (error) {
    console.error("[getLocationAnalytics]", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

