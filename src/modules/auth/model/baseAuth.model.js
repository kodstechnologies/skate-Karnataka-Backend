// models/baseAuth.model.js
import mongoose from "mongoose";

const options = {
    discriminatorKey: "role",
    timestamps: true,
};

const BaseAuthSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            trim: true,
            required: true,
        },
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
        email: {
            type: String,
            lowercase: true,
            trim: true,
            unique: true,
            sparse: true,
        },
        district: {
            type: String,
            trim: true,
            required: true,
        },
        dateOfBirth: {
            type: Date,
            required: true,
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
