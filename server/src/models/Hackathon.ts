import mongoose, { Document, Schema, Types } from "mongoose";

export interface IHackathon extends Document {
  ipfsCid: string; 
  organiserAddress: string; 
  identifier: string; // bytes32 hex string generated on-chain
  escrowContract: string;
}

const HackathonSchema = new Schema<IHackathon>(
  {
    ipfsCid: {
      type: String,
      required: true,
      trim: true,
    },
    escrowContract: {
      type: String,
      required: true,
      trim: true,
    },
    organiserAddress: {
      type: String,
      required: true,
      trim: true,
    },
    identifier: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Hackathon = mongoose.model<IHackathon>(
  "Hackathon",
  HackathonSchema
);
