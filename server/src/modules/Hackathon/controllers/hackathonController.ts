import { Request, Response } from "express";
import { HackathonService } from "../services/hackathonService";
import { requestUser } from "../../../common/resources/requestHelpers/requestUser";

function normalizeAddress(addr?: string): string {
  return (addr || "").trim().toLowerCase();
}

export class HackathonController {
  private hackathonService: HackathonService;

  constructor() {
    this.hackathonService = new HackathonService();
  }

  async getMyHackathons(req: Request, res: Response) {
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

      const hacks = await this.hackathonService.getMyHackathons(address);

      const data = hacks.map((h) => {
        const relationships = h.relationships || [];
        const relationship = relationships[0] || null;
        const { relationships: _r, ...doc } = h as any;
        return { ...doc, relationship, relationships };
      });

      res.json({
        success: true,
        message: "Hackathons retrieved successfully",
        count: data.length,
        data,
      });
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: "Failed to get related hackathons",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  async getAllHackathons(_req: Request, res: Response) {
    try {
      const hacks = await this.hackathonService.getAllHackathons();
      return res.json({
        success: true,
        message: "Hackathons retrieved successfully",
        count: hacks.length,
        data: hacks,
      });
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: "Failed to get hackathons",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
}

