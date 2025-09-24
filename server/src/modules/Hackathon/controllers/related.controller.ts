import { Request, Response } from "express";
import { getRelatedHackathons } from "../services/related.service";
import { requestUser } from "../../../common/resources/requestHelpers/requestUser";

function normalizeAddress(addr?: string): string {
  return (addr || "").trim().toLowerCase();
}

export async function getRelatedHackathonsController(
  req: Request,
  res: Response
) {
  try {
    const user = await requestUser(req);
    if (!user) {
      return res.status(401).json({ status: false, message: "Unauthorized" });
    }

    const addressParam = user.walletAddress;
    const address = normalizeAddress(addressParam);

    if (!address) {
      return res
        .status(400)
        .json({ status: false, message: "address query param is required" });
    }

    const hacks = await getRelatedHackathons(address);

    const data = hacks.map((h) => {
      const relationships = h.relationships || [];
      const relationship = relationships[0] || null;
      const { relationships: _r, ...doc } = h as any;
      return { ...doc, relationship, relationships };
    });

    return res.json({ status: true, count: data.length, data });
  } catch (e) {
    return res.status(500).json({
      status: false,
      message: "Failed to get related hackathons",
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
