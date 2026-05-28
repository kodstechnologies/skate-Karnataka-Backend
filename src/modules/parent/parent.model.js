import mongoose from "mongoose";
import { BaseAuth } from "../auth/baseAuth.model.js";

const parentSchema = new mongoose.Schema(
  {
    skaters: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Skater",
      },
    ],
  },
  {
    timestamps: true,
  }
);
export const Parent = BaseAuth.discriminator("Parent", parentSchema);