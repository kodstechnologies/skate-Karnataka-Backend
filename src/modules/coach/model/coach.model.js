import mongoose from "mongoose";

const coachSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        image: {
            type: String, // image URL
            default: "",
            trim: true,
        },

        description: {
            type: String,
            trim: true,
        },

        location: {
            type: String,
            trim: true,
        },

        rating: {
            type: Number,
            min: 0,
            max: 5,
            default: 0,
        },

        // ✅ Inline array of features
        features: [
            {
                title: {
                    type: String, // e.g. "Speed Training"
                    required: true,
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);

export const Coach = mongoose.model("Coach", coachSchema);
