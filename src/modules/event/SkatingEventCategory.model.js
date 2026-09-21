import mongoose from "mongoose";
import { CATEGORY_STATUS } from "./skatingEventCategory.policy.js";

// Fixed age groups for skating events
export const AGE_GROUPS = Object.freeze([
  { label: "Below 6", min: null, max: 6 },
  { label: "6-8", min: 6, max: 8 },
  { label: "8-10", min: 8, max: 10 },
  { label: "10-12", min: 10, max: 12 },
  { label: "12-15", min: 12, max: 15 },
  { label: "15-18", min: 15, max: 18 },
  { label: "18+", min: 18, max: null },
  { label: "35+", min: 35, max: null },
]);

const AGE_GROUP_LABELS = AGE_GROUPS.map((g) => g.label);

/** Lap / round label inside an age group (e.g. "1 Lap", "2 Laps + D"). */
const CategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    formula: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Formula",
      default: null,
    },
  },
  { _id: true }
);

const AgeGroupSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      enum: AGE_GROUP_LABELS,
    },
    categories: {
      type: [CategorySchema],
      default: [],
    },
  },
  { _id: true }
);

const CustomCategoryNameSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    formula: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Formula",
      default: null,
    },
  },
  { _id: false }
);

/** Per-club edits on a standard discipline (keyed by club id). */
const ClubCategoryOverrideSchema = new mongoose.Schema(
  {
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
      required: true,
      index: true,
    },
    typeName: {
      type: String,
      trim: true,
      default: "",
    },
    customCategoryNames: {
      type: [CustomCategoryNameSchema],
      default: [],
    },
    ageGroups: {
      type: [AgeGroupSchema],
      default: [],
    },
  },
  { _id: true, timestamps: true }
);

/** Per-district edits on a standard discipline (keyed by district id). */
const DistrictCategoryOverrideSchema = new mongoose.Schema(
  {
    district: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "District",
      required: true,
      index: true,
    },
    typeName: {
      type: String,
      trim: true,
      default: "",
    },
    customCategoryNames: {
      type: [CustomCategoryNameSchema],
      default: [],
    },
    ageGroups: {
      type: [AgeGroupSchema],
      default: [],
    },
  },
  { _id: true, timestamps: true }
);

const DisciplineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    categoryStatus: {
      type: String,
      enum: Object.values(CATEGORY_STATUS),
      default: CATEGORY_STATUS.STANDARD,
      required: true,
    },

    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
      default: null,
    },

    district: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "District",
      default: null,
    },

    ageGroups: {
      type: [AgeGroupSchema],
      default: [],
    },

    clubOverrides: {
      type: [ClubCategoryOverrideSchema],
      default: [],
    },

    districtOverrides: {
      type: [DistrictCategoryOverrideSchema],
      default: [],
    },

    customCategoryNames: {
      type: [CustomCategoryNameSchema],
      default: [],
    },
  },
  {
    _id: true,
    timestamps: true,
  }
);

DisciplineSchema.pre("validate", function validateDisciplineOwnership() {
  const status = this.categoryStatus || CATEGORY_STATUS.STANDARD;

  if (status === CATEGORY_STATUS.STANDARD) {
    this.club = null;
    this.district = null;
    return;
  }

  const hasClub = Boolean(this.club);
  const hasDistrict = Boolean(this.district);

  if (!hasClub && !hasDistrict) {
    throw new Error("Custom categories must be linked to a club or a district");
  }
  if (hasClub && hasDistrict) {
    throw new Error("Custom categories cannot be linked to both a club and a district");
  }
});

const SkatingEventCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    disciplines: {
      type: [DisciplineSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/** Legacy documents stored `typeName` on the parent. */
SkatingEventCategorySchema.pre("validate", function syncLegacyParentName() {
  if (!this.name) {
    const legacyName = this.get("typeName");
    if (legacyName) {
      this.name = legacyName;
    }
  }
});

SkatingEventCategorySchema.virtual("typeName")
  .get(function getTypeName() {
    return this.name;
  })
  .set(function setTypeName(value) {
    this.name = value;
  });

SkatingEventCategorySchema.index({ "disciplines._id": 1 });
SkatingEventCategorySchema.index({ "disciplines.clubOverrides.club": 1 });
SkatingEventCategorySchema.index({ "disciplines.districtOverrides.district": 1 });

export { DisciplineSchema };

export default mongoose.model("SkatingEventCategory", SkatingEventCategorySchema);
