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

    ageGroup: {
      type: String, // "6-8", "8-10"
      required: true,
    },

    categoriesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SkatingEventCategory",
    },

    division: {
      type: String,
      trim: true,
    },

    certificateID: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      immutable: true,
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
        attendanceStatus: {
          type: String,
          enum: ["pending", "attend", "absent"],
          default: "pending",
        },
      },
    ],

    // apply  ================

    skaterApply: {
      type: Boolean,
      default: false
    },
    clubAllow: {
      type: Boolean,
      default: false
    },

    districtAllow: {
      type: Boolean,
      default: false
    },

    stateAllow: {
      type: Boolean,
      default: false
    },

    // =====================

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

participantSchema.pre("save", async function () {
  if (this.certificateID) return;

  let attempts = 0;
  while (attempts < 15) {
    const num = Math.floor(100000 + Math.random() * 900000);
    const newId = `CERT${num}`;
    const exists = await this.constructor.findOne({ certificateID: newId }).lean();
    if (!exists) {
      this.certificateID = newId;
      return;
    }
    attempts++;
  }

  throw new Error("Failed to generate certificate ID");
});

export const EventParticipant = mongoose.model(
  "EventParticipant",
  participantSchema
);