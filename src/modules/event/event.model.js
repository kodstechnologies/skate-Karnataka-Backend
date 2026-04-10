import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    // 🧾 Header / Title
    header: {
      type: String,
      required: true,
      trim: true,
    },

    // 🖼 Image
    image: {
      type: String,
      default: "",
      trim: true,
    },

    // 📅 Date
    date: {
      type: Date,
      required: true,
    },

    // 📝 Description
    text: {
      type: String,
      trim: true,
    },

    // 📍 Address
    address: {
      type: String,
      trim: true,
    },

    // 🔥 Event Type (State / District / Club)
    eventType: {
      type: String,
      required: true,
      enum: ["State", "District", "Club"], // must match model names
    },

    // 🔥 Dynamic Reference ID
    eventFor: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "eventType", // 🔥 dynamic reference
    },

    status: {
      type: String,
      enum: ["coming_soon", "active", "cancelled", "completed"],
      default: "coming_soon"
    }
  },
  {
    timestamps: true,
  }
);

export const Event = mongoose.model("Event", eventSchema);