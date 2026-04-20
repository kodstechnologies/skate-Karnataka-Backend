import mongoose from "mongoose";
import { BaseAuth } from "../auth/baseAuth.model.js";

const schoolSchema = new mongoose.Schema({
  schoolName: {
    type: String,
  
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

  // 🗓 Serving From
  servingFrom: {
    type: Date,
  },

  // 🎓 Certification Info
  certificatesAvailable: {
    type: String,
  },

  certifiedBy: {
    type: String,
    trim: true,
  },

  // 🛼 Skating Details
  skatingInfraAvailable: {
    type: String,
  },

  skatingInfraInfo: {
    type: String,
    trim: true,
  },

  lookingForSkatingService: {
    type: String,
  },

  lookingForSkatingCoach: {
    type: String,
  },

  coachName: {
    type: String
  },
  coachGender: {
    type: String
  }
  , coachContact: {
    type: String
  },
  coachCertificates: {
    type: String
  },
  certifiedBy: {
    type: String
  },

  // 📂 Documents
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
}, {
  timestamps: true
});

export const School = BaseAuth.discriminator("School", schoolSchema);