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
    },

    /** Club/district: pending until Admin/State approves; state/admin uploads are approved. */
    adminApprovalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },

    deleteApprovalStatus: {
      type: String,
      enum: ["pending"],
      default: null,
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