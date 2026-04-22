import mongoose from "mongoose";
import { BaseAuth } from "../auth/baseAuth.model.js";

const stateSchema = new mongoose.Schema(
  {
  name: {
  type: String,
  default: "Karnataka",
  enum: ["Karnataka"]
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
  },
  { timestamps: true }
);

export const State = BaseAuth.discriminator("State", stateSchema);