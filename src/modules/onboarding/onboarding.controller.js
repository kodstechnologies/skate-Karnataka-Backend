import Onboarding from "./onboarding.model.js";

const extractString = (val) => {
  if (!val) return "";
  if (typeof val === "string") return val;
  // multer fields() may pass objects for non-file multipart fields — coerce
  if (typeof val === "object") return "";
  return String(val);
};

// GET all onboarding records
export const getAllOnboarding = async (req, res) => {
  try {
    const data = await Onboarding.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET single onboarding by ID
export const getOnboardingById = async (req, res) => {
  try {
    const data = await Onboarding.findById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Not found" });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST create onboarding
export const createOnboarding = async (req, res) => {
  try {
    const imgOne = extractString(req.body.imgOne);
    const imgTwo = extractString(req.body.imgTwo);
    const imgThree = extractString(req.body.imgThree);

    if (!imgOne || !imgTwo || !imgThree) {
      return res.status(400).json({ success: false, message: "imgOne, imgTwo, and imgThree are required" });
    }

    const data = await Onboarding.create({ imgOne, imgTwo, imgThree });
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH update onboarding
export const updateOnboarding = async (req, res) => {
  try {
    const update = {};
    if (req.body.imgOne) update.imgOne = extractString(req.body.imgOne);
    if (req.body.imgTwo) update.imgTwo = extractString(req.body.imgTwo);
    if (req.body.imgThree) update.imgThree = extractString(req.body.imgThree);

    const data = await Onboarding.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!data) return res.status(404).json({ success: false, message: "Not found" });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE onboarding
export const deleteOnboarding = async (req, res) => {
  try {
    const data = await Onboarding.findByIdAndDelete(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Not found" });
    res.status(200).json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
