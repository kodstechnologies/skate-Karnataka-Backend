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
      default: "",
      trim: true,
    },
    currentPhoto: {
      type: String,
      default: "",
      trim: true,
    },
    requestedPhoto: {
      type: String,
      default: "",
      trim: true,
    },
    requestType: {
      type: String,
      enum: ["rsfi", "photo"],
      required: true,
      default: "rsfi",
      index: true,
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

/** One pending request per skater+club+requestType; re-apply updates same typed row. */
skaterRsfiChangeRequestSchema.index(
  { skater: 1, club: 1, requestType: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

export const SkaterRsfiChangeRequest = mongoose.model(
  "SkaterRsfiChangeRequest",
  skaterRsfiChangeRequestSchema
);
