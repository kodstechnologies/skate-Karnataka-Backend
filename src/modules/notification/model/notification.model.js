import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true,
        },

        model: {
            type: String, // User | Venture
            required: true,
        },

        title: {
            type: String,
            required: true,
            trim: true,
        },

        body: {
            type: String,
            required: true,
            trim: true,
        },

        link: {
            type: String,
            default: "",
        },

        img: {
            type: String,
            default: "",
        },

        notificationType: {
            type: String,
            default: "",
        },

        isRead: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

export const Notification = mongoose.model(
    "Notification",
    notificationSchema
);
