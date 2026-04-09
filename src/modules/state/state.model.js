import mongoose from "mongoose";

const stateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "State name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
    },
  },
  { timestamps: true }
);

export const State = mongoose.model("State", stateSchema);