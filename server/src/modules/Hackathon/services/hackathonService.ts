import { Hackathon, IHackathon } from "../../../models/Hackathon";
import { Challenge } from "../../../models/Challenge";
import { Allocation } from "../../../models/Allocation";
import { RelatedHackathon } from "../types";

function normalizeAddress(addr: string): string {
  return (addr || "").trim().toLowerCase();
}

export class HackathonService {
  /**
   * Get Hackathons related to a user
   * @param userAddress
   * @returns
   */

  async getMyHackathons(userAddress: string): Promise<RelatedHackathon[]> {
    const address = normalizeAddress(userAddress);
    if (!address) return [];

    // Fetch organiser hackathons directly
    const organiserHacks = await Hackathon.find({
      organiserAddress: new RegExp(`^${address}$`, "i"),
    }).lean();
    const organiserMap = new Map<string, RelatedHackathon>();
    organiserHacks.forEach((h) => {
      organiserMap.set(String(h._id), {
        ...(h as any),
        relationships: ["organiser"],
      });
    });

    // Fetch sponsor challenges -> hackathons
    const sponsorChallenges = await Challenge.find(
      { sponsorAddress: new RegExp(`^${address}$`, "i") },
      { hackathon: 1 }
    ).lean();
    const sponsorHackIds = new Set<string>(
      sponsorChallenges.map((c) => String(c.hackathon))
    );

    // Fetch winner allocations -> challenges -> hackathons
    const winnerAllocations = await Allocation.find(
      { winnerAddress: new RegExp(`^${address}$`, "i") },
      { challenge: 1 }
    )
      .populate({
        path: "challenge",
        select: "hackathon",
        options: { lean: true } as any,
      })
      .lean();
    const winnerHackIds = new Set<string>();
    for (const alloc of winnerAllocations) {
      const ch = (alloc as any).challenge;
      if (ch && ch.hackathon) {
        winnerHackIds.add(String(ch.hackathon));
      }
    }

    // Combine all hackathon ids
    const allHackIds = new Set<string>([
      ...Array.from(organiserMap.keys()),
      ...Array.from(sponsorHackIds),
      ...Array.from(winnerHackIds),
    ]);

    if (allHackIds.size === 0) return [];

    // Load hackathon docs for any ids not already present from organiser fetch
    const missingHackIds = Array.from(allHackIds).filter(
      (id) => !organiserMap.has(id)
    );
    let missingDocs: IHackathon[] = [];
    if (missingHackIds.length) {
      missingDocs = await Hackathon.find({
        _id: { $in: missingHackIds },
      }).lean();
    }

    // Build output with relationships
    const resultMap = new Map<string, RelatedHackathon>();

    organiserMap.forEach((h, id) => resultMap.set(id, h));

    for (const doc of missingDocs) {
      resultMap.set(String(doc._id), { ...(doc as any), relationships: [] });
    }

    // Add sponsor relationship
    sponsorHackIds.forEach((id) => {
      const entry = resultMap.get(id);
      if (entry) {
        if (!entry.relationships.includes("sponsor"))
          entry.relationships.push("sponsor");
      }
    });

    // Add winner relationship
    winnerHackIds.forEach((id) => {
      const entry = resultMap.get(id);
      if (entry) {
        if (!entry.relationships.includes("winner"))
          entry.relationships.push("winner");
      }
    });

    // Ensure organiser label for organiser docs is present (already set)

    // Return as array
    return Array.from(resultMap.values());
  }

  /**
   * Get all hackathons sorted by creation date descending
   */
  async getAllHackathons(): Promise<IHackathon[]> {
    return Hackathon.find().sort({ createdAt: -1 }).lean();
  }
}

