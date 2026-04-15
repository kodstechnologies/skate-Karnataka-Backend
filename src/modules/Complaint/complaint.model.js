import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema(
  {
    // 🔹 Type (who raised or related to)
    type: {
      type: String,
      enum: ["skater", "club", "district"],
      required: true,
    },

    // 🔹 Reference ID (dynamic)
    refId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "typeModel", // dynamic ref
    },

    // 🔹 Dynamic model mapping
    typeModel: {
      type: String,
      required: true,
      enum: ["Skater", "Club", "District"],
    },

    // 🔹 Names (for quick access without populate)
    districtName: {
      type: String,
      default: "",
    },

    clubName: {
      type: String,
      default: "",
    },

    skaterName: {
      type: String,
      default: "",
    },

    skaterId: {
      type: String,
      default: "",
    },

    // 🔹 Message
    message: {
      type: String,
      required: true,
      trim: true,
    },

    // 🔹 Status
    status: {
      type: String,
      enum: ["pending", "resolved", "rejected"],
      default: "resolved",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Complaint", complaintSchema);