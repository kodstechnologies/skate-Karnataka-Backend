import mongoose from "mongoose";

const districtSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "District name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
    },
    img: {
      type: String,
      default: "",
      match: [/^(https?:\/\/.*\.(png|jpg|jpeg|webp))?$/, "Invalid image URL"],
    },
    about: {
      type: String,
      trim: true,
    },
    officeAddress: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
    rank: {
      type: Number,
      default: 0,
      min: 0,
    },
    championships: {
      type: Number,
      default: 0,
      min: 0,
    },
    presidentName: {
      type: String,
    },

    club: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Club",
      },
    ],
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "BaseAuth",
      },
    ],
  },
  { timestamps: true }
);

districtSchema.index({ name: 1 }, { unique: true });
districtSchema.path("members").default(() => []);

export const District = mongoose.model("District", districtSchema);