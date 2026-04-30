import mongoose from "mongoose";

const feedBackSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            trim: true,
        },
        email: {
            type: String,
            trim: true
        },
        phone: {
            type: String,
            trim: true
        },
        message: {
            type: String,
        },
        img: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true
    }
);

export const FeedBack = mongoose.model(
    "FeedBack",
    feedBackSchema
);