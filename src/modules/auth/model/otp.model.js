// models/otp.model.js
import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
    {
        identifier: {
            type: String, // phone number or email
            required: true,
            index: true,
        },

        otp: {
            type: String, // store hashed OTP in prod
            required: true,
        },

        expiresAt: {
            type: Date,
            required: true,
        },
    },
    { timestamps: true }
);

// ⏱ Auto-delete OTP after expiry
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Otp = mongoose.model("Otp", otpSchema);
