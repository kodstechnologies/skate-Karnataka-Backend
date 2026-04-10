import mongoose from "mongoose";
import { BaseAuth } from "./baseAuth.model.js";

const officialSchema = new mongoose.Schema({

  club: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Club",
    // required: true,
  },

  experience: {
    type: Number, // years
    default: 0,
  },

  technicalTrainingCourse: {
    type: String,

  },

  coachingExperience: {
    type: String,

  },

  isSkater: {
    type: String,

  },
  skaterDetails: {
    type: String,

  },

  isOfficiating: {
    type: String,

  },
  officiatingDetails: {
    type: String,

  },

  conductingClasses: {
    type: String,

  },
  conductingClassesDetails: {
    type: String,

  },
  coaching: {
    type: String,

  },
  officiating: {
    type: String,
  },

  officialContactNumber: {
    type: String,
  },

  officialEmail: {
    type: String
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