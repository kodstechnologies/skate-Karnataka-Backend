import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    // 🧾 Header / Title
    header: {
      type: String,
      required: function () {
        return this.isNew;
      },
      trim: true,
    },

    // 📅 Date
    date: {
      type: Date,
      required: function () {
        return this.isNew;
      },
    },

    // 📝 Description
    about: {
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
      required: function () {
        return this.isNew;
      },
      enum: ["State", "District", "Club"], // must match model names
    },

    // 🔥 Dynamic Reference ID
    eventFor: {
      type: mongoose.Schema.Types.ObjectId,
      required: function () {
        return this.isNew;
      },
      refPath: "eventType", // 🔥 dynamic reference
    },

    status: {
      type: String,
      enum: ["coming_soon", "active", "cancelled", "completed"],
      default: "coming_soon"
    },
    entryFee: {
      type: String,
    }
    ,
    colorOne: {
      type: String,
      default: "#6A11CB" // primary (purple)
    },
    colorTwo: {
      type: String,
      default: "#2575FC" // secondary (blue)
    },
    textColor: {
      type: String,
      default: "#FFFFFF" // white text (best for dark backgrounds)
    }
  },
  {
    timestamps: true,
  }
);

export const Event = mongoose.model("Event", eventSchema);