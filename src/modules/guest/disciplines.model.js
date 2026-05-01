import mongoose from "mongoose";

const disciplinesSchema = new mongoose.Schema(
  {
    img: {
      type: String,
      default: "",
      match: [/^(https?:\/\/.*\.(png|jpg|jpeg|webp))?$/, "Invalid image URL"],
    },
    title: {
      type: String,
      required: [true, "Discipline title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
    },
    text: {
      type: String,
      trim: true,
      default: "",
    },
    about: {
      type: String,
      required: [true, "Discipline about is required"],
      trim: true,
    },
  },
  { timestamps: true }
);

disciplinesSchema.index({ title: 1 }, { unique: true });

export const Discipline = mongoose.model("Discipline", disciplinesSchema);