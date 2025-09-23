import mongoose, { Document, Schema, Types } from "mongoose";

export interface IWhitelist extends Document {
  hackathon: Types.ObjectId; // Reference to Hackathon
  sponsorAddress: string; // Address whitelisted by organiser
}

const WhitelistSchema = new Schema<IWhitelist>(
  {
    hackathon: {
      type: Schema.Types.ObjectId,
      ref: "Hackathon",
      required: true,
      index: true,
    },
    sponsorAddress: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Whitelist = mongoose.model<IWhitelist>(
  "Whitelist",
  WhitelistSchema
);
