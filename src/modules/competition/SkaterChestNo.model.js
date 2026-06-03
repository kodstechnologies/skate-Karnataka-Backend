import mongoose from "mongoose";

const skaterChestNoSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    gender: {
      type: String,
      trim: true,
      lowercase: true,
    },
    photo: {
      type: String,
      trim: true,
      default: "",
    },
    krsaId: {
      type: String,
      trim: true,
    },
    rsfiId: {
      type: String,
      trim: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    ageGroup: {
      type: String,
      required: true,
    },
    categories: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
      },
    ],
    chestNo: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique constraints to prevent duplicate chest numbers for an event/ageGroup, or duplicate chest numbers for the same skater in an event.
skaterChestNoSchema.index({ eventId: 1, ageGroup: 1, chestNo: 1 }, { unique: true });
skaterChestNoSchema.index({ eventId: 1, krsaId: 1 }, { unique: true });

export const SkaterChestNo = mongoose.model("SkaterChestNo", skaterChestNoSchema);
