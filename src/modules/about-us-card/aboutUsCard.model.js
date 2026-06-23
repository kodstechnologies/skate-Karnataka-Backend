import mongoose from "mongoose";

const aboutUsCardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    photo: {
      type: String,
      required: true,
      trim: true
    }
  },
  { timestamps: true }
);

const AboutUsCard = mongoose.model("AboutUsCard", aboutUsCardSchema);
export default AboutUsCard;
