import mongoose from "mongoose";
import { BaseAuth } from "./baseAuth.model.js";

const officialSchema = new mongoose.Schema({
  club: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Club",
    required: true,
  },

  experience: {
    type: Number, // years
    default: 0,
  },

  technicalTrainingCourse: {
    type: Boolean,
    default: false,
  },

  coachingExperience: {
    type: Boolean,
    default: false,
  },

  isSkater: {
    type: Boolean,
    default: false,
  },

  officiatingDetails: {
    type: Boolean,
    default: false,
  },

  conductingClasses: {
    type: Boolean,
    default: false,
  },

  interestedIn: {
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

export const Official = BaseAuth.discriminator("Official", officialSchema);