import mongoose from "mongoose";
import { BaseAuth } from "../auth/baseAuth.model.js";

const districtMemberSchema = new mongoose.Schema(
  {
    designation: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },
  },
  {
    timestamps: true,
  }
);

// Use model name "DistrictMember" to avoid clashing with District collection model.
// Store discriminator key value as "District" so role-based auth continues to work.
export const DistrictMember = BaseAuth.discriminator(
  "DistrictMember",
  districtMemberSchema,
  "District"
);
