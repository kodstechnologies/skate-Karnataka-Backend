// models/user.model.js
import mongoose from "mongoose";
import { BaseAuth } from "./baseAuth.model.js";

const UserSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            trim: true,
            required: true,
        },

        dateOfBirth: {
            type: Date,
            required: true,
        },

        district: {
            type: String,
            trim: true,
            required: true,
        },

        email: {
            type: String,
            lowercase: true,
            trim: true,
            unique: true,
            sparse: true,
        },
    },
    { timestamps: false }
);

export const User = BaseAuth.discriminator("user", UserSchema);
