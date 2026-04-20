import mongoose from "mongoose";
import { BaseAuth } from "../auth/baseAuth.model.js";

const academySchema = new mongoose.Schema({

  clubName: {
    type: String,
    default: "",
  },
  ROSNumber: {
    type: String,
    default: "",

  },

  presidentName: { type: String, default: "" },
  presidentNumber: { type: String, default: "" },
  secretaryName: { type: String, default: "" },
  secretaryNumber: { type: String, default: "" },

  tenacitySkaters: { type: String, default: 0 },
  recreationalSkaters: { type: String, default: 0 },
  QuadSkaters: { type: String, default: 0 },
  ProInlineSkaters: { type: String, default: 0 },

  trackAddress: { type: String, default: "" },
  trackMeasurements: { type: String, default: "" },
  // numberOfTrainers: { type: Number, default: 0 },

  noOfTrainers: { type: String, default: 0 },
  trainerCertification: { type: String, default: "" },

  documents: [
    {
      url: { type: String, trim: true },
      name: { type: String, trim: true },
      uploadedAt: { type: Date, default: Date.now },
    },
  ],
});



export const Academy = BaseAuth.discriminator("Academy", academySchema);