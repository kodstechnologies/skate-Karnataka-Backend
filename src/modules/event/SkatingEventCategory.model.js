import mongoose from "mongoose";
import { CATEGORY_STATUS } from "./skatingEventCategory.policy.js";

// Fixed age groups for skating events
export const AGE_GROUPS = Object.freeze([
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
    /** Competition formula for this lap/time label (one Formula per custom name). */
    formula: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Formula",
      default: null,
    },
  },
  { _id: false }
);

/** Per-club edits on a standard KRSA category (keyed by club id). */
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

/** Per-district edits on a standard KRSA category (keyed by district id). */
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

const SkatingEventCategorySchema = new mongoose.Schema(
  {
    typeName: {
      type: String,
      required: true,
      trim: true,
    },

    /** standard = KRSA-wide (admin/state). custom = legacy standalone org doc. */
    categoryStatus: {
      type: String,
      enum: Object.values(CATEGORY_STATUS),
      default: CATEGORY_STATUS.STANDARD,
      required: true,
      index: true,
    },

    /** Legacy: standalone custom document for one club. Prefer clubOverrides on standard docs. */
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
      default: null,
      index: true,
    },

    /** Legacy: standalone custom document for one district. Prefer districtOverrides on standard docs. */
    district: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "District",
      default: null,
      index: true,
    },

    /** KRSA default age groups (super admin). */
    ageGroups: {
      type: [AgeGroupSchema],
      default: [],
    },

    /**
     * Club-specific overrides on this standard category.
     * Each entry is keyed by club; only that club's events use it when "Custom" is selected.
     */
    clubOverrides: {
      type: [ClubCategoryOverrideSchema],
      default: [],
    },

    /**
     * District-specific overrides on this standard category.
     * Each entry is keyed by district; only that district's events use it when "Custom" is selected.
     */
    districtOverrides: {
      type: [DistrictCategoryOverrideSchema],
      default: [],
    },

    /** Legacy flat list on standalone custom documents. */
    customCategoryNames: {
      type: [CustomCategoryNameSchema],
      default: [],
    },
  },
  { timestamps: true }
);

SkatingEventCategorySchema.pre("validate", function validateOwnership() {
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

/** One legacy custom category document per club. */
SkatingEventCategorySchema.index(
  { club: 1 },
  {
    unique: true,
    partialFilterExpression: {
      categoryStatus: CATEGORY_STATUS.CUSTOM,
      club: { $type: "objectId" },
    },
  }
);

/** One legacy custom category document per district. */
SkatingEventCategorySchema.index(
  { district: 1 },
  {
    unique: true,
    partialFilterExpression: {
      categoryStatus: CATEGORY_STATUS.CUSTOM,
      district: { $type: "objectId" },
    },
  }
);

SkatingEventCategorySchema.index({ "clubOverrides.club": 1 });
SkatingEventCategorySchema.index({ "districtOverrides.district": 1 });

export default mongoose.model("SkatingEventCategory", SkatingEventCategorySchema);
