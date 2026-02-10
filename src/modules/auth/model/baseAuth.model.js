// models/baseAuth.model.js
import mongoose from "mongoose";

const options = {
    discriminatorKey: "role",
    timestamps: true,
};

const BaseAuthSchema = new mongoose.Schema(
    {
        phone: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
        },

        countryCode: {
            type: String,
            default: "+91",
        },

        // Profile Photo
        photo: {
            type: String, // store image URL or filename
            default: "",
            trim: true,
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        // Multi-device refresh tokens
        refreshTokens: {
            type: [String],
            default: [],
        },

        // FCM tokens
        firebaseTokens: {
            type: [String],
            default: [],
        },
    },
    options
);

export const BaseAuth = mongoose.model("BaseAuth", BaseAuthSchema);
