import mongoose from "mongoose";
import { BaseAuth } from "../auth/baseAuth.model.js";

const clubMemberSchema = new mongoose.Schema(
  {},
  {
    timestamps: true,
  }
);

// Keep discriminator role as "Club" for existing auth guards.
export const ClubMember = BaseAuth.discriminator(
  "ClubMember",
  clubMemberSchema,
  "Club"
);
