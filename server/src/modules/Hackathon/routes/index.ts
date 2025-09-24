import { Router } from "express";
import { HackathonController } from "../controllers/hackathonController";
import { verifyToken } from "../../../middlewares/verifyAccessToken";

export const hackathonRouter = Router();
const hackathonController = new HackathonController();

// GET /api/hackathons/related?address=0x...
hackathonRouter.get(
  "/related",
  verifyToken,
  hackathonController.getMyHackathons
);
