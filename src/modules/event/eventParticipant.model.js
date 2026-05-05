import mongoose from "mongoose";

const participantSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BaseAuth",
    },

    name: {
      type: String,
      trim: true,
    },

    age: Number,

    ageGroup: {
      type: String, // "6-8", "8-10"
      required: true,
    },

    // 🔥 MULTIPLE CATEGORIES WITH RESULT
    categories: [
      {
        name: {
          type: String, // "1 Lap", "2 Laps"
          required: true,
          trim: true,
        },

        timeTaken: {
          type: Number, // store in seconds
          default: null,
        },

        rank: {
          type: Number,
          default: null,
        },

        isDisqualified: {
          type: Boolean,
          default: false,
        },

        remarks: {
          type: String,
          trim: true,
        },
      },
    ],

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export const EventParticipant = mongoose.model(
  "EventParticipant",
  participantSchema
);