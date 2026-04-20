import mongoose from "mongoose";
import { BaseAuth } from "../auth/baseAuth.model.js";

const guestSchema = new mongoose.Schema({
  interestedIn: [
    {
      type: String,
      trim: true,
      default:[]
    }
  ],
});

export const Guest = BaseAuth.discriminator("Guest", guestSchema);