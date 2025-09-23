import { Router } from "express";
import { getRelatedHackathonsController } from "../controllers/related.controller";

export const hackathonRouter = Router();

// GET /api/hackathons/related?address=0x...
hackathonRouter.get("/related", getRelatedHackathonsController);
