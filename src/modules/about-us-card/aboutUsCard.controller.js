import AboutUsCard from "./aboutUsCard.model.js";
import AboutUsCardMember from "./aboutUsCardMember.model.js";

const extractString = (val) => {
  if (!val) return "";
  if (typeof val === "string") return val.trim();
  if (typeof val === "object") return "";
  return String(val).trim();
};

export const getAllAboutUsCards = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      AboutUsCard.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AboutUsCard.countDocuments()
    ]);

    res.status(200).json({
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAboutUsCardById = async (req, res) => {
  try {
    const data = await AboutUsCard.findById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Not found" });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createAboutUsCard = async (req, res) => {
  try {
    const title = extractString(req.body.title);
    const photo = extractString(req.body.photo);

    if (!title) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }
    if (!photo) {
      return res.status(400).json({ success: false, message: "Photo is required" });
    }

    const data = await AboutUsCard.create({ title, photo });
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAboutUsCard = async (req, res) => {
  try {
    const update = {};
    if (req.body.title !== undefined) {
      const title = extractString(req.body.title);
      if (!title) {
        return res.status(400).json({ success: false, message: "Title is required" });
      }
      update.title = title;
    }
    if (req.body.photo) {
      update.photo = extractString(req.body.photo);
    }

    const data = await AboutUsCard.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true
    });
    if (!data) return res.status(404).json({ success: false, message: "Not found" });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteAboutUsCard = async (req, res) => {
  try {
    const data = await AboutUsCard.findByIdAndDelete(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Not found" });
    await AboutUsCardMember.deleteMany({ cardId: data._id });
    res.status(200).json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
