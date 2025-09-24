import { Request, Response } from "express";
import { UserService } from "../services/userService";
import logger from "../../../common/resources/logger";
import { requestUser } from "../../../common/resources/requestHelpers/requestUser";


export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  async updateUserProfile(req: Request, res: Response) {
    try {
      const { profile } = req.body;
      const userId = requestUser(req).id;

      const updatedUser = await this.userService.updateUserProfile(
        profile,
        userId
      );

      res.json({
        success: true,
        message: "User profile updated successfully",
        data: updatedUser,
      });
    } catch (error: any) {
      logger.error("Error updating user profile:", error);

      res.status(500).json({
        success: false,
        message: "Failed to update user profile",
        error: error.message,
      });
    }
  }
}
