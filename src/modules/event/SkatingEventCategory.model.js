import mongoose from "mongoose";

// ✅ Fixed Age Groups
export const AGE_GROUPS = Object.freeze([
  { label: "6-8", min: 6, max: 8 },
  { label: "8-10", min: 8, max: 10 },
  { label: "10-12", min: 10, max: 12 },
  { label: "12-15", min: 12, max: 15 },
  { label: "15-18", min: 15, max: 18 },
  { label: "18+", min: 18, max: null },
  { label: "35+", min: 35, max: null }
]);

// ✅ Category (laps / type inside age group)
const CategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true, // "1 Lap", "2 Laps + D"
      trim: true
    }
  },
  { _id: false }
);

// ✅ Age Group (ONLY label, controlled by enum)
const AgeGroupSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      enum: AGE_GROUPS.map(g => g.label) // 🔥 restrict values
    },

    categories: {
      type: [CategorySchema],
      default: []
    }
  },
  { _id: false }
);

// ✅ Main Model
const SkatingEventCategorySchema = new mongoose.Schema(
  {
    typeName: {
      type: String,
      required: true,
      trim: true // "Speed Skating"
    },

    ageGroups: {
      type: [AgeGroupSchema],
      default: []
    }
  },
  { timestamps: true }
);

export default mongoose.model(
  "SkatingEventCategory",
  SkatingEventCategorySchema
);