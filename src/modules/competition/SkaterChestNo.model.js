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

// One chest row per skater per age group; chest numbers are unique across the whole event (not per age group).
// skaterChestNoSchema.index({ eventId: 1, ageGroup: 1, chestNo: 1 }, { unique: true });
/** Same skater may register in multiple age groups — one row each, same chest number. */
// skaterChestNoSchema.index({ eventId: 1, krsaId: 1, ageGroup: 1 }, { unique: true, sparse: true });

export const SkaterChestNo = mongoose.model("SkaterChestNo", skaterChestNoSchema);
