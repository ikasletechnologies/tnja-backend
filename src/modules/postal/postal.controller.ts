import type { Request, Response } from "express";
import prisma from "../../database/prisma.js";

type Place = { pincode: string; district: string; state: string; region: string; taluk: string; offices: string[] };
const unique = (values: string[]) => Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const governmentLookup = async (pincode: string, apiKey: string, resourceId: string): Promise<Place | null> => {
  const url = new URL(`https://api.data.gov.in/resource/${resourceId}`);
  url.searchParams.set("api-key", apiKey); url.searchParams.set("format", "json"); url.searchParams.set("limit", "100"); url.searchParams.set("filters[pincode]", pincode);
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Government postal API returned ${response.status}`);
  const payload: any = await response.json();
  const records: Record<string, unknown>[] = Array.isArray(payload.records) ? payload.records : [];
  if (!records.length) return null;
  const value = (record: Record<string, unknown>, ...keys: string[]) => { for (const key of keys) { const found = record[key]; if (typeof found === "string" && found.trim()) return found.trim(); } return ""; };
  const first = records[0]!;
  return { pincode, district: value(first, "district", "District"), state: value(first, "statename", "state_name", "StateName"), region: value(first, "regionname", "region_name", "RegionName"), taluk: value(first, "taluk", "Taluk", "block", "Block"), offices: unique(records.map((record) => value(record, "officename", "office_name", "OfficeName"))) };
};

const fallbackLookup = async (pincode: string): Promise<Place | null> => {
  const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Postal fallback returned ${response.status}`);
  const payload: any = await response.json();
  const result = Array.isArray(payload) ? payload[0] : null;
  const offices = Array.isArray(result?.PostOffice) ? result.PostOffice : [];
  if (!offices.length) return null;
  return { pincode, district: offices[0]?.District || "", state: offices[0]?.State || "", region: offices[0]?.Region || "", taluk: offices[0]?.Taluk || offices[0]?.Block || "", offices: unique(offices.map((office: any) => office.Name || "")) };
};

export const lookupPincode = async (req: Request, res: Response) => {
  const pincode = String(req.params.pincode || "").trim();
  if (!/^\d{6}$/.test(pincode)) return res.status(400).json({ error: "Enter a valid 6-digit pincode." });
  const apiKey = process.env.POSTAL_CODE_API_KEY;
  const resourceId = process.env.POSTAL_CODE_API_RESOURCE_ID;
  if (!apiKey || !resourceId) return res.status(503).json({ error: "Pincode service is not configured." });
  try {
    let place: Place | null = null;
    try { place = await governmentLookup(pincode, apiKey, resourceId); }
    catch (error) { console.warn("Government pincode API unavailable, using fallback:", error); }
    if (!place) place = await fallbackLookup(pincode);
    if (!place) return res.status(404).json({ error: "No place found for this pincode." });
    res.setHeader("Cache-Control", "public, max-age=86400");
    const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
    const districts = await prisma.district.findMany({ include: { taluks: { orderBy: { name: "asc" } } } });
    const aliases: Record<string, string> = { udamalpet: "udumalaipettai", udumalpet: "udumalaipettai" };
    const postalTaluk = aliases[normalize(place.taluk)] || normalize(place.taluk);
    const matchedByTaluk = districts
      .flatMap((item) => item.taluks.map((taluk) => ({ district: item, taluk })))
      .find(({ taluk }) => normalize(taluk.name) === postalTaluk);
    const district = matchedByTaluk?.district
      || districts.find((item) => normalize(item.name) === normalize(place.district));
    const talukCandidates = district?.taluks || [];
    const taluk = matchedByTaluk?.taluk || talukCandidates.find((item) => {
      const name = normalize(item.name);
      return name === postalTaluk || name === normalize(place.region) || place.offices.some((office) => name === normalize(office));
    });
    return res.json({
      ...place,
      district: district?.name || place.district,
      districtId: district?.id || "",
      talukId: taluk?.id || "",
      talukName: taluk?.name || place.taluk || "",
      taluks: talukCandidates.map((item) => ({ id: item.id, name: item.name })),
    });
  } catch (error) {
    console.error("Pincode lookup failed:", error);
    return res.status(502).json({ error: "Unable to fetch place details right now." });
  }
};




