import { User, IUser } from "../../../models/User";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../../../common/utils/jwt";
import {
  verifySignature,
  validateMessageFormat,
} from "../utils/signatureVerification";
import { AuthRequest, AuthResponse, UserAuthData, TokenPair } from "../types";

export class AuthService {
  /**
   * Authenticate user with wallet signature
   * @param authData - Authentication request data
   * @returns Promise<AuthResponse> - Authentication response
   */
  async authenticateUser(authData: AuthRequest): Promise<AuthResponse> {
    try {
      // Step 1: Verify signature format and message
      if (!validateMessageFormat(authData.message, authData.nonce)) {
        return {
          success: false,
          message: "Invalid message format",
          error: "Message does not match expected nonce format",
        };
      }

      // Step 2: Verify signature using ethers
      const verificationResult = verifySignature(
        authData.signature,
        authData.message,
        authData.address
      );

      if (!verificationResult.isValid) {
        return {
          success: false,
          message: "Invalid signature",
          error: verificationResult.error || "Signature verification failed",
        };
      }

      // Step 3: Check if user exists
      let user = await this.findUserByAddress(authData.address);

      if (user) {
        // Existing user - generate tokens and return
        const tokens = await this.generateTokens(user);
        return {
          success: true,
          message: "Authentication successful",
          data: {
            user: this.formatUserData(user),
            tokens,
          },
        };
      } else {
        // New user - create user account
        user = await this.createUser(authData.address);
        const tokens = await this.generateTokens(user);

        return {
          success: true,
          message: "User created and authenticated successfully",
          data: {
            user: this.formatUserData(user),
            tokens,
          },
        };
      }
    } catch (error) {
      return {
        success: false,
        message: "Authentication failed",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Find user by wallet address
   * @param walletAddress - The wallet address to search for
   * @returns Promise<IUser | null> - User document or null
   */
  private async findUserByAddress(
    walletAddress: string
  ): Promise<IUser | null> {
    try {
      return await User.findOne({ walletAddress: walletAddress });
    } catch (error) {
      throw new Error("Failed to find user");
    }
  }

  /**
   * Create a new user
   * @param walletAddress - The wallet address for the new user
   * @returns Promise<IUser> - The created user document
   */
  private async createUser(walletAddress: string): Promise<IUser> {
    try {
      const user = new User({
        walletAddress: walletAddress.toLowerCase(),
      });

      return await user.save();
    } catch (error) {
      throw new Error("Failed to create user");
    }
  }

  /**
   * Generate JWT tokens for user
   * @param user - The user document
   * @returns Promise<TokenPair> - Access and refresh tokens
   */
  private async generateTokens(user: IUser): Promise<TokenPair> {
    try {
      const accessToken = generateAccessToken({
        userId: (user._id as any).toString(),
        deviceId: "wallet-auth", // Since we're using wallet auth
        email: user.walletAddress, // Using wallet address as email for compatibility
      });

      const refreshToken = generateRefreshToken({
        userId: (user._id as any).toString(),
        deviceId: "wallet-auth",
        email: user.walletAddress,
      });

      return { accessToken, refreshToken };
    } catch (error) {
      throw new Error("Failed to generate tokens");
    }
  }

  /**
   * Format user data for response
   * @param user - The user document
   * @returns UserAuthData - Formatted user data
   */
  private formatUserData(user: IUser): UserAuthData {
    return {
      id: (user._id as any).toString(),
      walletAddress: user.walletAddress,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Refresh access token using refresh token
   * @param refreshToken - The refresh token
   * @returns Promise<AuthResponse> - New token pair
   */
  async refreshTokens(refreshToken: string): Promise<AuthResponse> {
    try {
      // Verify the refresh token
      const decodedToken = verifyRefreshToken(refreshToken);
      
      // Find the user by ID from the token
      const user = await User.findById(decodedToken.userId);
      
      if (!user) {
        return {
          success: false,
          message: "User not found",
          error: "Invalid refresh token: user does not exist",
        };
      }

      // Generate new token pair
      const tokens = await this.generateTokens(user);

      return {
        success: true,
        message: "Tokens refreshed successfully",
        data: {
          user: this.formatUserData(user),
          tokens,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: "Token refresh failed",
        error: error instanceof Error ? error.message : "Invalid refresh token",
      };
    }
  }

  /**
   * Get user by ID
   * @param userId - The user ID to search for
   * @returns Promise<IUser | null> - User document or null
   */
  async getUserById(userId: string): Promise<IUser | null> {
    try {
      return await User.findById(userId);
    } catch (error) {
      throw new Error("Failed to find user by ID");
    }
  }
}
