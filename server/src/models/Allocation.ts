import mongoose, { Document, Schema, Types } from "mongoose";

export interface IAllocation extends Document {
  challenge: Types.ObjectId; // Reference to Challenge
  position: number; // Position in winners array (1-based)
  amount: string;
  winnerAddress: string;
  claimed: boolean;
}

const AllocationSchema = new Schema<IAllocation>(
  {
    challenge: {
      type: Schema.Types.ObjectId,
      ref: "Challenge",
      required: true,
      index: true,
    },
    position: {
      type: Number,
      required: true,
    },
    amount: {
      type: String,
      required: true,
      trim: true,
    },
    winnerAddress: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    claimed: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Allocation = mongoose.model<IAllocation>(
  "Allocation",
  AllocationSchema
);
