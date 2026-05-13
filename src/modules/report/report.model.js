import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    ownClub: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
    },
    complainedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BaseAuth"
    },
    reportType: {
      type: String,
      required: true,
      lowercase: true,
    },

    message: {
      type: String,
      required: true,
    },

    clubName: {
      type: String,
    },
    skaterName: {
      type: String,
    },
    districtName: {
      type: String
    },

    krsaId: {
      type: String, // since KRSA ID is usually a custom ID (not ObjectId)
    },

    status: {
      type: String,
      enum: ["pending", "solved", "inprogress", "notSolved"],
      default: "pending",
    },
    clubStatus: {
      type: String,
      enum: ["pending", "solved", "inprogress", "notSolved"],
      default: "pending",
    },
    districtStatus: {
      type: String,
      enum: ["pending", "solved", "inprogress", "notSolved"],
      default: "pending",
    },
    StateStatus: {
      type: String,
      enum: ["pending", "solved", "inprogress", "notSolved"],
      default: "pending",
    },
    clubMessage: {
      type: String,
      default: "",
    },
    districtMessage: {
      type: String,
      default: ""
    },
    stateMessage: {
      type: String,
      default: ""
    },
  },
  {
    timestamps: true,
  }
);

export const Report = mongoose.model("Report", reportSchema);