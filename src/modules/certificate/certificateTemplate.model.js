import mongoose from "mongoose";

const certificateTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    pdfUrl: {
      type: String,
      required: true,
      trim: true,
    },
    layout: {
      type: Object,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    applyTo: {
      type: String,
      enum: ["STATE", "DISTRICT", "CLUB"],
      default: "STATE",
    },
  },
  {
    timestamps: true,
  },
);

export const CertificateTemplate = mongoose.model(
  "CertificateTemplate",
  certificateTemplateSchema,
);
