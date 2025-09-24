import { Router } from "express";
import { HackathonController } from "../controllers/hackathonController";
import { verifyToken } from "../../../middlewares/verifyAccessToken";

export const hackathonRouter = Router();
const hackathonController = new HackathonController();

/**
 * @swagger
 * /api/hackathons:
 *   get:
 *     summary: Get all hackathons
 *     description: Returns a list of all hackathons sorted by creation date (newest first)
 *     tags: [Hackathons]
 *     security: []
 *     responses:
 *       200:
 *         description: List of hackathons
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Hackathons retrieved successfully"
 *                 count:
 *                   type: integer
 *                   example: 2
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Hackathon'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /api/hackathons - list all hackathons sorted by createdAt desc
hackathonRouter.get("/", hackathonController.getAllHackathons);

/**
 * @swagger
 * /api/hackathons/related:
 *   get:
 *     summary: Get hackathons related to the authenticated user
 *     description: Returns hackathons where the user is an organiser, sponsor, or winner
 *     tags: [Hackathons]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Related hackathons
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Hackathons retrieved successfully"
 *                 count:
 *                   type: integer
 *                   example: 1
 *                 data:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Hackathon'
 *                       - type: object
 *                         properties:
 *                           relationship:
 *                             type: string
 *                             nullable: true
 *                             example: "organiser"
 *                           relationships:
 *                             type: array
 *                             items:
 *                               type: string
 *                             example: ["organiser", "sponsor"]
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /api/hackathons/related
hackathonRouter.get(
  "/related",
  verifyToken,
  hackathonController.getMyHackathons
);

