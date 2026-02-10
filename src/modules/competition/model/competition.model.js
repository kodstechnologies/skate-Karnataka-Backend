import mongoose from "mongoose";

const coachSchema = new mongoose.Schema(
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
            trim: true,
            required: true,
        },

        // 📝 Short text (subtitle / tagline)
        text: {
            type: String,
            trim: true,
        },

        // 📄 Detailed description
        description: {
            type: String,
            trim: true,
        },

        // 📅 Event / Coaching Date
        date: {
            type: Date,
            required: true,
        },

        // 💰 Entry Fee
        entryFee: {
            type: Number,
            min: 0,
            default: 0,
        },

        // 📎 File (image / pdf / brochure URL)
        file: {
            type: String, // store file URL or filename
            trim: true,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

export const Coach = mongoose.model("Coach", coachSchema);
