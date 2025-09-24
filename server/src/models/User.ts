import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  walletAddress: string;
  profile: {
    displayName?: string;
    avatar?: string;
  };
  ensName?: string;
}

const UserSchema = new Schema<IUser>(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    profile: {
      displayName: {
        type: String,
        trim: true,
      },
      avatar: {
        type: String,
        default: "",
      },
    },
    ensName: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>("User", UserSchema);
