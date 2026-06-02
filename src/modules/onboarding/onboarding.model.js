import mongoose from "mongoose";

const onboardingSchema = new mongoose.Schema(
  {
    imgOne: { type: String, required: true },
    imgTwo: { type: String, required: true },
    imgThree: { type: String, required: true },
  },
  { timestamps: true }
);

const Onboarding = mongoose.model("Onboarding", onboardingSchema);
export default Onboarding;
