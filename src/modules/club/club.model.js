import mongoose from "mongoose";

const clubSchema = new mongoose.Schema(
    {
        district: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "District",
            required: [true, "District is required"],
            index: true,
        },
        districtName: {
            type: String,
            trim: true
        },
        name: {
            type: String,
            required: [true, "Club name is required"],
            trim: true,
            minlength: [2, "Name must be at least 2 characters"],
            maxlength: [100, "Name cannot exceed 100 characters"],
        },

        img: {
            type: String,
            default: "",
            match: [
                /^(https?:\/\/.*\.(?:png|jpg|jpeg|webp))?$/,
                "Please use a valid image URL",
            ],
        },

        address: {
            type: String,
            trim: true,
            maxlength: [200, "Address too long"],
        },

        about: {
            type: String,
            trim: true,
            maxlength: [500, "About section max 500 characters"],
        },

        skaters: {
            type: Number,
            default: 0,
            min: [0, "Skaters cannot be negative"],
        },

        rank: {
            type: Number,
            min: [1, "Rank must be at least 1"],
        },

        championships: {
            type: Number,
            default: 0,
            min: [0, "Championships cannot be negative"],
        },
    },
    { timestamps: true }
);
clubSchema.index({ name: 1, district: 1 }, { unique: true });
export const Club = mongoose.model("Club", clubSchema);