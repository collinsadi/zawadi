import mongoose, { Document, Schema, Types } from "mongoose";

export interface IApproval extends Document {
  challenge: Types.ObjectId; 
  sponsorApproved: boolean;
  organiserApproved: boolean;
}

const ApprovalSchema = new Schema<IApproval>(
  {
    challenge: {
      type: Schema.Types.ObjectId,
      ref: "Challenge",
      required: true,
      unique: true,
    },
    sponsorApproved: {
      type: Boolean,
      required: true,
      default: false,
    },
    organiserApproved: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Approval = mongoose.model<IApproval>("Approval", ApprovalSchema);
