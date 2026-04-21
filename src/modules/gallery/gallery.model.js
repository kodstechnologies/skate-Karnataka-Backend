import mongoose from "mongoose";

const gallerySchema = new mongoose.Schema(
  {
    imageUrl: {
      type: String,
      default: null,
    },

    videoUrl: {
      type: String,
      default: null,
    },

    ownerType: {
      type: String,
      enum: ["club", "district", "state"],
      required: true,
    },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "ownerType",
    },
  },
  { timestamps: true }
);

export const Gallery = mongoose.model("Gallery", gallerySchema);