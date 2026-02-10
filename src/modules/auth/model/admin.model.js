// models/admin.model.js
import mongoose from "mongoose";
import { BaseAuth } from "./baseAuth.model.js";

const AdminSchema = new mongoose.Schema({
    firstName: {
        type: String,
        trim: true,
        required: true,
    },

    lastName: {
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
});

export const Admin = BaseAuth.discriminator("admin", AdminSchema);
