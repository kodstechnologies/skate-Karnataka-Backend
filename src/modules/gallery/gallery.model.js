import mongoose from "mongoose";

const gallerySchema = new mongoose.Schema(
    {
        image: {
            type: String, // image URL or filename
            required: true,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

export const Gallery = mongoose.model("Gallery", gallerySchema);