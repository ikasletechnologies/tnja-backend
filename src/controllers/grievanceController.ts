import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";

export const createGrievance = async (req: Request, res: Response) => {
  try {
    const { userId, userName, userEmail, role, subject, description } = req.body;

    if (!userId || !role || !subject || !description) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const grievance = await prisma.grievance.create({
      data: {
        userId,
        userName: userName || "Anonymous",
        userEmail: userEmail || "N/A",
        role,
        subject,
        description,
        status: "PENDING"
      }
    });

    return res.status(201).json({
      message: "Grievance submitted successfully",
      grievance
    });
  } catch (error: any) {
    console.error("Create Grievance error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getMyGrievances = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const grievances = await prisma.grievance.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });

    return res.status(200).json(grievances);
  } catch (error: any) {
    console.error("Get My Grievances error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getAllGrievances = async (req: Request, res: Response) => {
  try {
    const grievances = await prisma.grievance.findMany({
      orderBy: { createdAt: "desc" }
    });

    return res.status(200).json(grievances);
  } catch (error: any) {
    console.error("Get All Grievances error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const replyToGrievance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;

    const grievance = await prisma.grievance.update({
      where: { id },
      data: {
        reply,
        status: "REPLAY" 
      }
    });

    return res.status(200).json({
      message: "Reply sent successfully",
      grievance
    });
  } catch (error: any) {
    console.error("Reply to Grievance error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
