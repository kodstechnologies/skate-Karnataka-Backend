import mongoose from "mongoose";

const newsSchema = new mongoose.Schema(
    {
        img: {
            type: String,

        },
        heading: {
            type: String,
        },
        about: {
            type: String,
        },

    },
    {
        timestamps: true
    }
);

export const News = mongoose.model(
    "News",
    newsSchema
);