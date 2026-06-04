import mongoose from "mongoose";

const RoundSchema = new mongoose.Schema(
  {
    roundName: {
      type: String,
      enum: [
        "1stRound",
        "2ndRound",
        "quarterFinal",
        "semiFinal",
        "final",
      ],
      required: true,
    },

    qualificationType: {
      type: String,
      enum: ["TIME", "POSITION"],
      required: true,
    },

    // For TIME based selection
    minParticipants: Number,
    maxParticipants: Number,
    qualifyCount: Number,

    // Threshold based qualification
    qualifyCountLessThan65: Number,
    qualifyCountMoreThan65: Number,

    // For POSITION based selection
    groupSize: Number, // 6, 7, 8 etc.
    qualifyPerGroup: Number, // top 2, top 3 etc.
  },
  { _id: false }
);

const FormulaSchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: true,
      trim: true,
    },

    ageGroup: {
      type: String,
      required: true,
    },

    rounds: {
      type: [RoundSchema],
      default: [],
    },

    finalSelectionCount: {
      type: Number,
      default: 3, // Gold Silver Bronze
    },
  },
  { timestamps: true }
);

export default mongoose.model("Formula", FormulaSchema);