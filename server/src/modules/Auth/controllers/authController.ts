import { Request, Response } from "express";
import { AuthService } from "../services/authService";
import { AuthRequest, AuthResponse } from "../types";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();

    // Bind methods to preserve 'this' context
    this.authenticate = this.authenticate.bind(this);
    this.refreshTokens = this.refreshTokens.bind(this);
  }

  /**
   * Authenticate user with wallet signature
   * @param req - Express request object
   * @param res - Express response object
   */
  async authenticate(req: Request, res: Response): Promise<void> {
    try {
      const { signature, message, address, nonce } = req.body;

      // Validate required fields
      if (!signature || !message || !address || !nonce) {
        res.status(400).json({
          success: false,
          message: "Missing required fields",
          error: "signature, message, address, and nonce are required",
        });
        return;
      }

      // Validate field types
      if (
        typeof signature !== "string" ||
        typeof message !== "string" ||
        typeof address !== "string" ||
        typeof nonce !== "string"
      ) {
        res.status(400).json({
          success: false,
          message: "Invalid field types",
          error: "All fields must be strings",
        });
        return;
      }

      // Create auth request object
      const authRequest: AuthRequest = {
        signature,
        message,
        address,
        nonce,
      };

      // Process authentication
      const result: AuthResponse = await this.authService.authenticateUser(
        authRequest
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(401).json(result);
      }
    } catch (error) {
      console.error("Authentication error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: "Authentication processing failed",
      });
    }
  }

  /**
   * Refresh access token using refresh token
   * @param req - Express request object
   * @param res - Express response object
   */
  async refreshTokens(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      // Validate required fields
      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: "Missing required fields",
          error: "refreshToken is required",
        });
        return;
      }

      // Validate field type
      if (typeof refreshToken !== "string") {
        res.status(400).json({
          success: false,
          message: "Invalid field type",
          error: "refreshToken must be a string",
        });
        return;
      }

      // Process token refresh
      const result: AuthResponse = await this.authService.refreshTokens(refreshToken);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(401).json(result);
      }
    } catch (error) {
      console.error("Token refresh error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: "Token refresh processing failed",
      });
    }
  }

  /**
   * Get user profile by ID
   * @param req - Express request object
   * @param res - Express response object
   */
  async getUserProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.id;

      if (!userId) {
        res.status(400).json({
          success: false,
          message: "User ID is required",
          error: "Missing user ID parameter",
        });
        return;
      }

      const user = await this.authService.getUserById(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          message: "User not found",
          error: "User with the specified ID does not exist",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "User profile retrieved successfully",
        data: {
          id: (user._id as any).toString(),
          walletAddress: user.walletAddress,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error) {
      console.error("Get user profile error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: "Failed to retrieve user profile",
      });
    }
  }
}
