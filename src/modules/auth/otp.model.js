import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BaseAuth",
            index: true,
        },

        email: {
            type: String,
            lowercase: true,
            trim: true,
            sparse: true,
            match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
        },

        phone: {
            type: String,
            index: true,
            trim: true,
            minlength: [10, "Phone number must be exactly 10 digits"],
            maxlength: [10, "Phone number must be exactly 10 digits"],
            match: [/^[6-9]\d{9}$/, "Please enter a valid Indian phone number"],
        },
        krsaId: {
            type: String,
            index: true,
            immutable: true,
        },
        otp: {
            type: String,
            required: [true, "OTP is required"], // ✅ only required field
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