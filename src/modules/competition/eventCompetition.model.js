import mongoose from "mongoose";

const competitorSchema = new mongoose.Schema(
  {
    skaterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BaseAuth",
    },
    chestNo: {
      type: String,
      trim: true,
    },
    fullName: {
      type: String,
      trim: true,
    },
    krsaId: {
      type: String,
      trim: true,
    },
    rsfiId: {
      type: String,
      trim: true,
    },
    time: {
      type: String,
      trim: true,
      default: "",
    },
    position: {
      type: String,
      enum: ["0", "1", "2", "3"],
      trim: true,
      default: "0"
    },
  },
  { _id: false }
);

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    "1stRound": {
      type: [competitorSchema],
      default: [],
    },
    "2ndRound": {
      type: [competitorSchema],
      default: [],
    },
    "3rdRound": {
      type: [competitorSchema],
      default: [],
    },
    "quarterFinal": {
      type: [competitorSchema],
      default: [],
    },
    "semiFinal": {
      type: [competitorSchema],
      default: [],
    },
    "final": {
      type: [competitorSchema],
      default: [],
    },
    "1st": {
      type: [competitorSchema],
      default: [],
    },
    "2nd": {
      type: [competitorSchema],
      default: [],
    },
    "3rd": {
      type: [competitorSchema],
      default: [],
    },
    /**
     * Manual result mode per gender + round: "position" | "time".
     * Example: { boys: { "1stRound": "position" }, girls: { "1stRound": "time" } }
     */
    resultType: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  // Allow any extra round keys (custom rounds) to be stored.
  { _id: false, strict: false }
);

const eventCompetitionSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    ageGroup: {
      type: String,
      required: true,
      trim: true,
    },
    categories: [categorySchema],
  },
  {
    timestamps: true,
  }
);

// Unique constraint: one competition document per event per age group
eventCompetitionSchema.index({ eventId: 1, ageGroup: 1 }, { unique: true });

export const EventCompetition = mongoose.model(
  "EventCompetition",
  eventCompetitionSchema
);
