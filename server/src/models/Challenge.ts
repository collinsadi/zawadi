import mongoose, { Document, Schema, Types } from "mongoose";

export interface IChallenge extends Document {
  hackathon: Types.ObjectId;
  challengeId: number;
  totalPrize: string;
  sponsorAddress: string;
  ipfsCid?: string;
}

const ChallengeSchema = new Schema<IChallenge>(
  {
    hackathon: {
      type: Schema.Types.ObjectId,
      ref: "Hackathon",
      required: true,
      index: true,
    },
    challengeId: {
      type: Number,
      required: true,
    },
    totalPrize: {
      type: String,
      required: true,
      trim: true,
    },
    sponsorAddress: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    ipfsCid: {
      type: String,
      required: false,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Challenge = mongoose.model<IChallenge>(
  "Challenge",
  ChallengeSchema
);
