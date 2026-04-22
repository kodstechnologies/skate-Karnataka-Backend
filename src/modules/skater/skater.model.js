import mongoose from "mongoose";
import { type } from "node:os";
import { BaseAuth } from "../auth/baseAuth.model.js";

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
    lowercase: true,
    trim: true,
  },

  discipline: {
    type: String,
    lowercase: true,
    trim: true,
  },

  // district: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: "District",
  //   // required: true,
  // },
  applyClub: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
    },
  ],
  club: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Club",
    // required: true,
  },
  clubStatus: {
    type: String,
    enum: ["apply", "join", "apply-leave", "leave", "reject"],
    default: "apply"
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
  // createdBy: {
  //   type: String
  // },
  documents: [
    {
      url: String,
      name: String,
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});


export const Skater = BaseAuth.discriminator("Skater", skaterSchema);