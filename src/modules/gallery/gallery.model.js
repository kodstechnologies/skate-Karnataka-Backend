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

    title: {
      type: String,
      default: "",
    },
    about: {
      type: String,
      default: "",
    },
    ownerType: {
      type: String,
      enum: ["admin", "club", "district", "state"],
      required: true,
    },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "BaseAuth",
    },
    // onlyStat:{
    //   type: boolean,
    //   default: false
    // },
    // onlyDistrict:{
    //   type: Boolean
    // }
    // onlyClub:{

    // },
    // onlySkater:{

    // }
  },
  { timestamps: true }
);

export const Gallery = mongoose.model("Gallery", gallerySchema);