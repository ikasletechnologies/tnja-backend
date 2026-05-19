import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";

export const login = async (req: Request, res: Response) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: "Identifier and password are required" });
  }

  try {
    // ── Super Admin ──────────────────────────────────────────────────────────
    const adminEmail = process.env.SUPER_ADMIN_EMAIL || "admin@tnja.com";
    const adminPassword = process.env.SUPER_ADMIN_PASSWORD || "admin123";

    if (identifier === adminEmail) {
      const isPasswordValid = password === adminPassword;
      if (!isPasswordValid) return res.status(401).json({ error: "Invalid password" });
      const token = jwt.sign(
        { userId: "ADMIN", role: "SUPER_ADMIN" },
        process.env.JWT_SECRET || "fallback",
        { expiresIn: "24h" }
      );

      return res.json({
        message: "Login successful",
        user: { fullName: "Super Admin", email: adminEmail },
        role: "SUPER_ADMIN",
        token: token,
      });
    }

    // ── Student ───────────────────────────────────────────────────────────────
    let user: any = await prisma.student.findFirst({
      where: { OR: [{ email: identifier }, { tempId: identifier }, { permanentId: identifier }] },
    });
    let role = "PLAYER";

    // ── Coach / Referee ───────────────────────────────────────────────────────
    if (!user) {
      user = await prisma.coachReferee.findFirst({
        where: { OR: [{ email: identifier }, { tempId: identifier }, { permanentId: identifier }] },
      });
      if (user) role = "COACH";
    }

    // ── Member ────────────────────────────────────────────────────────────────
    if (!user) {
      user = await prisma.member.findFirst({
        where: { OR: [{ email: identifier }, { tempId: identifier }, { permanentId: identifier }] },
      });
      if (user) role = user.role; // Use the role from the DB (MEMBER, DISTRICT_PRESIDENT, etc.)
    }

    // ── Club ──────────────────────────────────────────────────────────────────
    if (!user) {
      user = await prisma.club.findFirst({
        where: { OR: [{ email: identifier }, { permanentId: identifier }, { tempId: identifier }] },
      });
      if (user) role = "CLUB";
    }

    if (!user) {
      return res.status(404).json({ error: "No account found with that ID or email" });
    }

    // ── Status check: PENDING / REJECTED users have no password yet ───────────
    if (user.status === "PENDING") {
      return res.status(403).json({
        error: "Your application is still pending approval. You will receive login credentials by email once approved.",
        status: "PENDING",
        tempId: user.tempId,
      });
    }
    if (user.status === "REJECTED") {
      return res.status(403).json({
        error: "Your application was rejected. Please contact the TNJA office.",
        status: "REJECTED",
        remark: user.rejectionRemark || "",
      });
    }

    // ── Password validation ───────────────────────────────────────────────────
    if (!user.password) {
      return res.status(401).json({ error: "Account has no password set. Please contact admin." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    const isMemberRole = ["MEMBER", "DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY"].includes(role);
    const tokenPayload: any = { userId: user.id, role: role };
    if (isMemberRole && user.districtId) {
      tokenPayload.districtId = user.districtId;
    }

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || "fallback",
      { expiresIn: "24h" }
    );

    return res.json({
      message: "Login successful",
      user: {
        id: user.id,
        fullName: user.fullName || user.name,
        email: user.email,
        status: user.status,
        tempId: user.tempId,
        permanentId: user.permanentId,
        districtId: user.districtId,
        mustChangePassword: user.permanentId ? user.mustChangePassword : false
      },
      role,
      token,
    });

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getProfile = async (req: any, res: Response) => {
  const { userId, role } = req.user;

  try {
    let userData: any = null;

    if (role === "SUPER_ADMIN") {
      return res.json({
        role: "SUPER_ADMIN",
        user: { fullName: "Super Admin", email: process.env.SUPER_ADMIN_EMAIL || "admin@tnja.com" }
      });
    }

    if (role === "PLAYER") {
      userData = await prisma.student.findUnique({
        where: { id: userId },
        include: { district: true, taluk: true, club: true, coach: true }
      });
    } else if (role === "COACH") {
      userData = await prisma.coachReferee.findUnique({
        where: { id: userId },
        include: { district: true, taluk: true, club: true }
      });
    } else if (["MEMBER", "DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY"].includes(role)) {
      userData = await prisma.member.findUnique({
        where: { id: userId },
        include: { district: true, taluk: true }
      });
    } else if (role === "CLUB") {
      userData = await prisma.club.findUnique({
        where: { id: userId },
        include: { district: true, taluk: true }
      });
    }

    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }

    // Remove password before sending
    const { password: _, ...safeData } = userData;

    return res.json({
      role,
      user: safeData
    });

  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const changePassword = async (req: any, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const { userId, role } = req.user;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current and new passwords are required" });
  }

  try {
    let user: any = null;
    let model: any = null;

    if (role === "PLAYER") model = prisma.student;
    else if (role === "COACH") model = prisma.coachReferee;
    else if (["MEMBER", "DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY"].includes(role)) model = prisma.member;
    else if (role === "CLUB") model = prisma.club;
    else return res.status(403).json({ error: "Super Admin password cannot be changed via this endpoint" });

    user = await model.findUnique({ where: { id: userId } });

    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ error: "Incorrect current password" });

    const hashedNew = await bcrypt.hash(newPassword, 10);

    await model.update({
      where: { id: userId },
      data: {
        password: hashedNew,
        mustChangePassword: false
      }
    });

    return res.json({ message: "Password changed successfully. You can now access your dashboard." });

  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    // Check all models for the email
    let user: any = await prisma.student.findUnique({ where: { email } });
    let modelName: string = "student";

    if (!user) {
      user = await prisma.coachReferee.findUnique({ where: { email } });
      modelName = "coachReferee";
    }
    if (!user) {
      user = await prisma.member.findUnique({ where: { email } });
      modelName = "member";
    }
    if (!user) {
      user = await prisma.club.findUnique({ where: { email } });
      modelName = "club";
    }

    if (!user) {
      // For security, don't reveal if user exists. Just say email sent.
      return res.json({ message: "If an account with that email exists, we have sent a reset link." });
    }

    // Generate Token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    // Update user with token
    await (prisma as any)[modelName].update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires,
      },
    });

    // Send Email
    const resetLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;
    
    // Dynamically import sendResetPasswordEmail to avoid circular dependency issues if any
    const { sendResetPasswordEmail } = await import("../lib/mailer.js");
    await sendResetPasswordEmail({
      toEmail: user.email,
      toName: user.fullName || user.clubName,
      resetLink,
    });

    return res.json({ message: "A password reset link has been sent to your email." });

  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: "Token and new password are required" });
  }

  try {
    let user: any = null;
    let modelName: string = "";

    const models = ["student", "coachReferee", "member", "club"];
    
    for (const m of models) {
      const found = await (prisma as any)[m].findFirst({
        where: {
          resetPasswordToken: token,
          resetPasswordExpires: { gt: new Date() },
        },
      });
      if (found) {
        user = found;
        modelName = m;
        break;
      }
    }

    if (!user) {
      return res.status(400).json({ error: "Password reset token is invalid or has expired." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await (prisma as any)[modelName].update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        mustChangePassword: false, // Reset this if it was their first login
      },
    });

    return res.json({ message: "Your password has been reset successfully. You can now log in." });

  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

