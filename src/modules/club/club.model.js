import mongoose from "mongoose";

const clubSchema = new mongoose.Schema(
    {
        clubId: {
            type: String,
            unique: true,
        },

        district: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "District",
            required: [true, "District is required"],
            index: true,
        },

        districtName: {
            type: String,
            trim: true,
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

        medals: {
             type: Number,
        },

        championships: {
            type: Number,
            default: 0,
            min: [0, "Championships cannot be negative"],
        },
    },
    { timestamps: true }
);

// ✅ Unique club name inside same district
clubSchema.index({ name: 1, district: 1 }, { unique: true });


// ✅ Pre-save hook for generating unique clubId
clubSchema.pre("save", async function (next) {
    try {
        if (!this.clubId) {
            let isUnique = false;
            let generatedId;

            while (!isUnique) {
                const randomNumber = Math.floor(1000 + Math.random() * 9000); // 4 digit
                generatedId = `KRSA-CLB-${randomNumber}`;

                const existing = await mongoose.models.Club.findOne({ clubId: generatedId });

                if (!existing) {
                    isUnique = true;
                }
            }

            this.clubId = generatedId;
        }

        next();
    } catch (error) {
        next(error);
    }
});


export const Club = mongoose.model("Club", clubSchema);