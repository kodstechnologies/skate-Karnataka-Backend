import mongoose from "mongoose";

const adminPasswordResetSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

adminPasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AdminPasswordReset = mongoose.model(
  "AdminPasswordReset",
  adminPasswordResetSchema
);
