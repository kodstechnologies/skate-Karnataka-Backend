import mongoose from "mongoose";
import { BaseAuth } from "./baseAuth.model.js";

const schoolSchema = new mongoose.Schema({
  schoolName: {
    type: String,
    required: true,
    trim: true,
  },

  board: {
    type: String,
    trim: true,
  },

  principalName: {
    type: String,
    trim: true,
  },

  schoolEmail: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, "Invalid email"],
  },

  schoolContactNumber: {
    type: String,
    match: [/^[6-9]\d{9}$/, "Invalid phone number"],
  },

  skatingInfraAvailable: {
    type: Boolean,
    default: false,
  },

  skatingInfraInfo: {
    type: String,
    trim: true,
  },

  lookingForSkatingService: {
    type: Boolean,
    default: false,
  },

  lookingForSkatingCoach: {
    type: Boolean,
    default: false,
  },

  skatingCoachInfo: {
    type: String,
    trim: true,
  },

  documents: [
    {
      url: {
        type: String,
        required: true,
      },
      name: {
        type: String,
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

export const School = BaseAuth.discriminator("School", schoolSchema);