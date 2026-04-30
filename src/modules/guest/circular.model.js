import mongoose from "mongoose";

const circularSchema = new mongoose.Schema(
  {
    img: {
      type: String,
      default: "",
      trim: true
    },

    heading: {
      type: String,
      required: true,
      trim: true
    },

    text: {
      type: String,
      required: true,
      trim: true
    },

    date: {
      type: Date,
      required: true,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

export const Circular = mongoose.model("Circular", circularSchema);