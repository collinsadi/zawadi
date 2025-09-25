import { Router, type Request, type Response } from "express";
import { PinataUtils } from "../../common/utils/pinata/index";

export const ipfsRouter = Router();

// Shared Pinata utility
const pinataUtils = new PinataUtils();

ipfsRouter.post("/json", async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body || typeof body !== "object") {
      return res.status(400).json({ error: "Invalid JSON body" });
    }

    // Upload JSON via Pinata utils
    const cid = await pinataUtils.uploadMetadata(body);
    return res.json({ cid });
  } catch (err) {
    console.error("Pinata upload json error:", err);
    return res.status(500).json({ error: "Failed to upload to IPFS" });
  }
});
