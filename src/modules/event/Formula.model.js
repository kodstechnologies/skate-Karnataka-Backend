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
    formulaName: {
      type: String,
      required: true,
      trim: true,
    },

    /** @deprecated Optional legacy fields — use formulaName for display */
    categoryName: {
      type: String,
      trim: true,
      default: "",
    },

    ageGroup: {
      type: String,
      default: "",
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

/** Backfill formulaName from legacy categoryName on older documents */
FormulaSchema.pre("validate", function backfillFormulaName() {
  if (!String(this.formulaName || "").trim() && String(this.categoryName || "").trim()) {
    this.formulaName = String(this.categoryName).trim();
  }
});

export default mongoose.model("Formula", FormulaSchema);
