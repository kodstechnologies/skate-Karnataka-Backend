import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
    {
        // 👤 Coach Name
        name: {
            type: String,
            required: true,
            trim: true,
        },

        // 🧾 Header / Title
        header: {
            type: String,
            required: true,
            trim: true,
        },

        // 🖼 Image (URL or filename)
        image: {
            type: String,
            default: "",
            trim: true,
        },

        // 📅 Date
        date: {
            type: Date,
            required: true,
        },

        // 📝 Text / Short Description
        text: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

export const Event = mongoose.model("Event", coachSchema);