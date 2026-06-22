import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";

export const downloadCertificate = async (req: Request, res: Response) => {
  const { userId, role } = (req as any).user;
  const tournamentId = req.params.id as string;

  if (role !== "PLAYER" && role !== "STUDENT") {
    return res.status(403).json({ error: "Only participants can download certificates." });
  }

  try {
    const registration = await prisma.tournamentRegistration.findUnique({
      where: {
        tournamentId_playerId: {
          tournamentId,
          playerId: userId,
        },
      },
      include: {
        player: { select: { fullName: true } },
        tournament: { select: { title: true, date: true, status: true } },
      },
    });

    if (!registration) {
      return res.status(404).json({ error: "Registration not found." });
    }

    if (registration.tournament.status !== "CLOSED") {
      return res.status(400).json({ error: "Certificate is only available after the tournament is closed." });
    }

    const { player, tournament, placement } = registration;

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([842, 595]); // A4 Landscape

    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const { width, height } = page.getSize();

    // Embed and draw TNJA Logo & Organization Heading
    let currentY = height - 40; // Start near the top
    try {
      const logoPath = path.join(process.cwd(), "assets", "Logo.png");
      if (fs.existsSync(logoPath)) {
        const logoImageBytes = fs.readFileSync(logoPath);
        const logoImage = await pdfDoc.embedPng(logoImageBytes);
        const logoDims = logoImage.scale(0.55); // Adjust scale as needed

        currentY -= logoDims.height;
        page.drawImage(logoImage, {
          x: width / 2 - logoDims.width / 2,
          y: currentY,
          width: logoDims.width,
          height: logoDims.height,
        });

        currentY -= 35; // Space below logo
        const orgName = "TAMIL NADU JUDO ASSOCIATION";
        const orgNameWidth = font.widthOfTextAtSize(orgName, 26);
        page.drawText(orgName, {
          x: width / 2 - orgNameWidth / 2,
          y: currentY,
          size: 26,
          font,
          color: rgb(0.1, 0.4, 0.8), // Dark blue
        });
        currentY -= 50; // Space below org name
      }
    } catch (err) {
      console.error("Error loading logo for certificate:", err);
    }

    // Draw border
    page.drawRectangle({
      x: 30,
      y: 30,
      width: width - 60,
      height: height - 60,
      borderColor: rgb(0.2, 0.2, 0.8),
      borderWidth: 5,
    });

    let certificateTitle = "CERTIFICATE OF PARTICIPATION";
    let placementText = "has actively participated in";
    let color = rgb(0.3, 0.3, 0.3);

    if (placement === "FIRST") {
      certificateTitle = "CERTIFICATE OF ACHIEVEMENT";
      placementText = "has won FIRST PLACE in";
      color = rgb(0.85, 0.65, 0.13); // Gold
    } else if (placement === "SECOND") {
      certificateTitle = "CERTIFICATE OF ACHIEVEMENT";
      placementText = "has won SECOND PLACE in";
      color = rgb(0.75, 0.75, 0.75); // Silver
    } else if (placement === "THIRD") {
      certificateTitle = "CERTIFICATE OF ACHIEVEMENT";
      placementText = "has won THIRD PLACE in";
      color = rgb(0.8, 0.5, 0.2); // Bronze
    }

    // Title
    const titleWidth = font.widthOfTextAtSize(certificateTitle, 40);
    page.drawText(certificateTitle, {
      x: width / 2 - titleWidth / 2,
      y: currentY,
      size: 40,
      font,
      color,
    });
    currentY -= 45;

    // Subtitle
    const subtitle = "This is to certify that";
    const subWidth = regularFont.widthOfTextAtSize(subtitle, 20);
    page.drawText(subtitle, {
      x: width / 2 - subWidth / 2,
      y: currentY,
      size: 20,
      font: regularFont,
    });
    currentY -= 60;

    // Player Name
    const nameWidth = font.widthOfTextAtSize(player.fullName, 36);
    page.drawText(player.fullName, {
      x: width / 2 - nameWidth / 2,
      y: currentY,
      size: 36,
      font,
      color: rgb(0, 0, 0),
    });
    currentY -= 50;

    // Placement Text
    const placeWidth = regularFont.widthOfTextAtSize(placementText, 20);
    page.drawText(placementText, {
      x: width / 2 - placeWidth / 2,
      y: currentY,
      size: 20,
      font: regularFont,
    });
    currentY -= 50;

    // Tournament Name
    const tNameWidth = font.widthOfTextAtSize(tournament.title, 30);
    page.drawText(tournament.title, {
      x: width / 2 - tNameWidth / 2,
      y: currentY,
      size: 30,
      font,
      color: rgb(0.1, 0.4, 0.8),
    });
    currentY -= 40;

    // Date
    const dateText = `Held on ${new Date(tournament.date).toLocaleDateString("en-IN")}`;
    const dateWidth = regularFont.widthOfTextAtSize(dateText, 18);
    page.drawText(dateText, {
      x: width / 2 - dateWidth / 2,
      y: currentY,
      size: 18,
      font: regularFont,
    });

    // Signatures
    page.drawLine({
      start: { x: 150, y: 100 },
      end: { x: 300, y: 100 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    page.drawText("Authorized Signature", {
      x: 170,
      y: 80,
      size: 14,
      font: regularFont,
    });

    page.drawLine({
      start: { x: width - 300, y: 100 },
      end: { x: width - 150, y: 100 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    page.drawText("Tournament Official", {
      x: width - 280,
      y: 80,
      size: 14,
      font: regularFont,
    });

    const pdfBytes = await pdfDoc.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${player.fullName.replace(/\s+/g, "_")}_certificate.pdf"`
    );
    return res.end(Buffer.from(pdfBytes));

  } catch (error) {
    console.error("Error generating certificate:", error);
    return res.status(500).json({ error: "Failed to generate certificate." });
  }
};
