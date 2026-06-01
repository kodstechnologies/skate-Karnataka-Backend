import mongoose from "mongoose";

const skaterRsfiChangeRequestSchema = new mongoose.Schema(
  {
    skater: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Skater",
      required: true,
      index: true,
    },
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
      required: true,
      index: true,
    },
    currentRsfiId: {
      type: String,
      default: "",
      trim: true,
    },
    requestedRsfiId: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "superseded"],
      default: "pending",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BaseAuth",
    },
    reviewedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

/** One pending RSFI change per skater per club; re-apply updates the same row. */
skaterRsfiChangeRequestSchema.index(
  { skater: 1, club: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

export const SkaterRsfiChangeRequest = mongoose.model(
  "SkaterRsfiChangeRequest",
  skaterRsfiChangeRequestSchema
);
