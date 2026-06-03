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
    },
    position: {
      type: String,
      enum: ["first", "second", "fail"],
      trim: true,
    },
  },
  { _id: false }
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
    categories: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        "4thRound": {
          type: [competitorSchema],
          default: [],
        },
        "3rdRound": {
          type: [competitorSchema],
          default: [],
        },
        "2ndRound": {
          type: [competitorSchema],
          default: [],
        },
        "1round": {
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
      },
    ],
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
