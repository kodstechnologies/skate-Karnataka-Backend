import mongoose from "mongoose";
import { BaseAuth } from "./baseAuth.model.js";

const guestSchema = new mongoose.Schema({
  interestedIn: {
    type: String,
    trim: true,
  },
});

export const Guest = BaseAuth.discriminator("Guest", guestSchema);