import mongoose from "mongoose";
import { BaseAuth } from "../auth/baseAuth.model.js";

/** Club role on BaseAuth (same pattern as Skater / Academy). */
const clubSchema = new mongoose.Schema(
  {
    clubId: {
      type: String,
      unique: true,
      index: true,
    },

    district: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "District",
      // required: true,
      index: true,
    },

    applyDistrict: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "District",
      },
    ],

    districtStatus: {
      type: String,
      enum: ["apply", "join", "apply-leave", "leave", "reject"],
      default: "apply"
    },

    districtName: {
      type: String,
      trim: true,
    },

    name: {
      type: String,
      // required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    img: {
      type: String,
      default: "",
      match: [/^(https?:\/\/.*\.(png|jpg|jpeg|webp))?$/, "Invalid image URL"],
    },

    address: {
      type: String,
      trim: true,
      maxlength: 200,
    },

    about: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    skaters: {
      type: Number,
      default: 0,
      min: 0,
    },

    rank: {
      type: Number,
      default: 0,
      min: 0,
    },

    championships: {
      type: Number,
      default: 0,
      min: 0,
    },

    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "BaseAuth",
      },
    ],
  }
);


// ✅ Unique club per district
clubSchema.index({ name: 1, district: 1 }, { unique: true });
clubSchema.path("members").default(() => []);


// ✅ Auto set districtName (optimized)
clubSchema.pre("save", async function () {
  if (!this.isModified("district")) return;

  const district = await mongoose.models.District
    .findById(this.district)
    .select("name")
    .lean();

  if (district) {
    this.districtName = district.name;
  }

});


// ✅ Generate unique clubId (optimized)
clubSchema.pre("save", async function () {
  if (this.clubId) return;

  let exists = true;

  while (exists) {
    const random = Math.floor(1000 + Math.random() * 9000);
    const generatedId = `KRSA-CLB-${random}`;

    exists = await mongoose.models.Club.exists({ clubId: generatedId });

    if (!exists) {
      this.clubId = generatedId;
    }
  }

});

clubSchema.virtual("skaterCount", {
  ref: "BaseAuth",
  localField: "_id",
  foreignField: "club",
  count: true,
});

clubSchema.set("toJSON", { virtuals: true });
clubSchema.set("toObject", { virtuals: true });

export const Club = mongoose.model("Club", clubSchema);