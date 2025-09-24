import { User, IUser } from "../../../models/User";

export class UserService {
  /**
   * Update user profile
   * @param walletAddress - User wallet address
   * @param profile - User profile data
   * @returns Promise<User> - Updated user
   */

  async updateUserProfile(
    profile: { displayName?: string; avatar?: string },
    userId: string
  ): Promise<IUser> {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    user.profile.displayName = profile.displayName;
    user.profile.avatar = profile.avatar;

    await user.save();

    return user;
  }
}
