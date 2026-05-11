import mongoose from "mongoose";

const disciplineServiceSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            unique: true,
        },
    },
    {
        timestamps: true,
    }
);

export const DisciplineService =
    mongoose.models.DisciplineService ||
    mongoose.model("DisciplineService", disciplineServiceSchema);

