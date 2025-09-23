import { Request, Response } from "express";
import { getRelatedHackathons } from "../services/related.service";

function normalizeAddress(addr?: string): string {
  return (addr || "").trim().toLowerCase();
}

export async function getRelatedHackathonsController(req: Request, res: Response) {
  try {
    const addressParam = typeof req.query.address === 'string' ? req.query.address : '';
    const address = normalizeAddress(addressParam);

    if (!address) {
      return res.status(400).json({ status: false, message: "address query param is required" });
    }

    const hacks = await getRelatedHackathons(address);

    const data = hacks.map((h) => {
      const relationships = h.relationships || [];
      const relationship = relationships[0] || null; // primary role (organiser > sponsor > winner based on service order)
      const { relationships: _r, ...doc } = h as any;
      return { ...doc, relationship, relationships };
    });

    return res.json({ status: true, count: data.length, data });
  } catch (e) {
    return res.status(500).json({ status: false, message: "Failed to get related hackathons", error: e instanceof Error ? e.message : String(e) });
  }
}
