import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";

export const getDistricts = async (req: Request, res: Response) => {
  try {
    const districts = await prisma.district.findMany({
      orderBy: { name: 'asc' }
    });
    return res.json(districts);
  } catch (error) {
    console.error("Error fetching districts:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getTaluksByDistrict = async (req: Request, res: Response) => {
  const districtId = String(req.params.districtId);
  try {
    const taluks = await prisma.taluk.findMany({
      where: { districtId },
      orderBy: { name: 'asc' }
    });
    return res.json(taluks);
  } catch (error) {
    console.error("Error fetching taluks:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getTalukDetails = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  try {
    const taluk = await prisma.taluk.findUnique({
      where: { id }
    });
    if (!taluk) return res.status(404).json({ error: "Taluk not found" });
    return res.json(taluk);
  } catch (error) {
    console.error("Error fetching taluk details:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
