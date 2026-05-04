import mongoose from "mongoose";

const KRSAaboutSchema = new mongoose.Schema(
    {
        logo: {
            type: String,
            default: "",
            trim: true,
        },
        img: [
            {
                type: String,
                default: "",
                trim: true,
            },
        ],

        heading: {
            type: String,
            required: true,
            trim: true,
        },

        about: {
            type: String,
            required: true,
            trim: true,
        },

        ourMission: {
            type: String,
            required: true,
            trim: true,
        },

        student: {
            type: Number,
            default: 0,
        },

        titles: {
            type: String,
            trim: true,
            default: "",
        },

        address: {
            type: String,
            trim: true,
        },

        email: {
            type: String,
            trim: true,
            lowercase: true,
        },

        phoneNo: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

export const KRSAabout = mongoose.model("KRSAabout", KRSAaboutSchema);