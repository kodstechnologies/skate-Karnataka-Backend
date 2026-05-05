import mongoose from "mongoose";

const SponsorshipAndDonationSchema = new mongoose.Schema(
  {
    img: {
      type: String,
      trim: true,
      default: "",
    },

    brandName: {
      type: String,
      trim: true,
      required: true,
    },

    title: {
      type: String,
      trim: true,
      required: true,
    },

    about: {
      type: String,
      trim: true,
      default: "",
    },

    support: {
      type: String,
      trim: true,
      default: "",
    },

    contribution: {
      type: String,
      trim: true,
      default: "",
    },

    duration: {
      type: String,
      trim: true,
      default: "",
    },

    supportType: {
      type: String,
      enum: ["sponsorship", "donation"],
      required: true,
      lowercase: true,
    },

    donorName: {
      type: String,
      trim: true,
      default: "",
    },

    amount: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export const SponsorshipAndDonation = mongoose.model(
  "SponsorshipAndDonation",
  SponsorshipAndDonationSchema
);