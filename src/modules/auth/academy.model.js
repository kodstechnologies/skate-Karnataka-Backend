import mongoose from "mongoose";
import { BaseAuth } from "./baseAuth.model.js";

const academySchema = new mongoose.Schema({
  kRSAClubId: {
    type: String,
    unique: true,
  },

  clubName: {
    type: String,
    default: "",
  },
  ROSNumber: {
    type: String,
    default: "",
  },
  district: {
    type: String,
    default: "",
  },

  RegistrationAddress: {
    type: String,
    default: "",
  },
  ROSCertificate: {
    type: String,
    default: "",
  },

  presidentName: { type: String, default: "" },
  presidentNumber: { type: String, default: "" },
  secretaryName: { type: String, default: "" },
  secretaryNumber: { type: String, default: "" },

  tenacitySkaters: { type: Number, default: 0 },
  recreationalSkaters: { type: Number, default: 0 },
  QuadSkaters: { type: Number, default: 0 },
  ProInlineSkaters: { type: Number, default: 0 },

  trackAddress: { type: String, default: "" },
  trackMeasurements: { type: String, default: "" },
  numberOfTrainers: { type: Number, default: 0 },

  noOfTrainers: { type: Number, default: 0 },
  trainerCertification: { type: String, default: "" },

  documents: [
    {
      url: { type: String, trim: true },
      name: { type: String, trim: true },
      uploadedAt: { type: Date, default: Date.now },
    },
  ],
});


// ✅ AUTO GENERATE KRSA CLUB ID
academySchema.pre("save", function (next) {
  if (!this.krsaClubId) {
    const random = Math.floor(1000 + Math.random() * 9000);
    this.krsaClubId = `KRSA-${Date.now()}-${random}`;
  }
  next();
});

export const Academy = BaseAuth.discriminator("Academy", academySchema);