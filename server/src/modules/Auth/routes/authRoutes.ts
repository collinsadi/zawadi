import { Router } from "express";
import { AuthController } from "../controllers/authController";
import { getNonceForUser } from "../utils/nonceGenerator";

const router = Router();
const authController = new AuthController();

/**
 * @swagger
 * /api/auth/nonce/{address}:
 *   get:
 *     summary: Get nonce for wallet authentication
 *     description: Generates a unique nonce for wallet-based authentication
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: Ethereum wallet address
 *         example: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"
 *     responses:
 *       200:
 *         description: Nonce generated successfully
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
 *                   example: "Nonce generated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     nonce:
 *                       type: string
 *                       example: "abc123def456"
 *       400:
 *         description: Bad request - missing wallet address
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/nonce/:address", (req, res) => {
  const { address } = req.params;
  if (!address) {
    return res.status(400).json({
      success: false,
      message: "Wallet address is required",
      error: "Missing wallet address parameter",
    });
  }

  const nonce = getNonceForUser(address);
  res.json({
    success: true,
    message: "Nonce generated successfully",
    data: { nonce },
  });
});

/**
 * @swagger
 * /api/auth/authenticate:
 *   post:
 *     summary: Authenticate user with wallet signature
 *     description: Authenticates a user using their wallet signature and nonce
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address
 *               - signature
 *               - nonce
 *             properties:
 *               address:
 *                 type: string
 *                 description: Ethereum wallet address
 *                 example: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"
 *               signature:
 *                 type: string
 *                 description: Signature of the nonce message
 *                 example: "0x1234567890abcdef..."
 *               nonce:
 *                 type: string
 *                 description: Nonce used for authentication
 *                 example: "abc123def456"
 *     responses:
 *       200:
 *         description: Authentication successful
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
 *                   example: "Authentication successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request - invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/authenticate", authController.authenticate);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Refreshes an expired access token using a valid refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Valid refresh token
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Token refresh successful
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
 *                   example: "Tokens refreshed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request - missing refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Token refresh failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/refresh", authController.refreshTokens);

export default router;
