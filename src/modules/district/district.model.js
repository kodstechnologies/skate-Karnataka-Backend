import mongoose from "mongoose";
import { BaseAuth } from "../auth/baseAuth.model.js";

const districtSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "District name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
    },
    img: {
      type: String,
      default: "",
      match: [/^(https?:\/\/.*\.(png|jpg|jpeg|webp))?$/, "Invalid image URL"],
    },
    about: {
      type: String,
      trim: true,
    },

    club: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Club",
      },
    ],
  },
  { timestamps: true }
);

export const District = BaseAuth.discriminator("District", districtSchema);