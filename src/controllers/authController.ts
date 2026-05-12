import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import prisma from "../lib/prisma.js";
import jwt from "jsonwebtoken";

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
      if (user) role = "MEMBER";
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

    const token = jwt.sign(
      { userId: user.id, role: role },
      process.env.JWT_SECRET || "fallback",
      { expiresIn: "24h" }
    );

    return res.json({
      message: "Login successful",
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        status: user.status,
        tempId: user.tempId,
        permanentId: user.permanentId,
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
        include: { district: true, taluk: true, club: true }
      });
    } else if (role === "COACH") {
      userData = await prisma.coachReferee.findUnique({
        where: { id: userId },
        include: { district: true, taluk: true, club: true }
      });
    } else if (role === "MEMBER") {
      userData = await prisma.member.findUnique({
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

