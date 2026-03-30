import mongoose from "mongoose";
import { BaseAuth } from "./baseAuth.model.js";

const skaterSchema = new mongoose.Schema({
  photo: {
    type: String,
    default: "",
    trim: true,
  },

  rsfiId: {
    type: String,
    default: "",
    trim: true,
  },

  dob: {
    type: Date,
  },

  aadharNumber: {
    type: String,
    trim: true,
    match: [/^\d{12}$/, "Aadhar must be 12 digits"],
  },

  category: {
    type: String,
    enum: ["junior", "senior", "sub-junior"],
    lowercase: true,
    trim: true,
  },

  discipline: {
    type: String,
    lowercase: true,
    trim: true,
  },

  district: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "District",
    required: true,
  },

  club: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Club",
    required: true,
  },

  parent: {
    type: String,
    trim: true,
  },

  bloodGroup: {
    type: String,
    uppercase: true,
    trim: true,
  },

  school: {
    type: String,
    default: "",
    trim: true,
  },

  grade: {   
    type: String,
    default: "",
    trim: true,
  },

  signature: {
    type: String,
    default: "",
  },

  documents: [
    {
      url: {
        type: String,
        required: false,
        trim: true,
      },
      name: {
        type: String,
        trim: true,
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

export const Skater = BaseAuth.discriminator("Skater", skaterSchema);