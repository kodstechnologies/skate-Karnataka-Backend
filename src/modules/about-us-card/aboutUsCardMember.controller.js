import AboutUsCard from "./aboutUsCard.model.js";
import AboutUsCardMember from "./aboutUsCardMember.model.js";

const extractString = (val) => {
  if (val === undefined || val === null) return "";
  if (typeof val === "string") return val.trim();
  if (typeof val === "object") return "";
  return String(val).trim();
};

const ensureParentCard = async (cardId) => {
  const card = await AboutUsCard.findById(cardId);
  if (!card) return null;
  return card;
};

const normalizePhoneNo = (value) => {
  const digits = extractString(value).replace(/\D/g, "");
  if (!digits) return "";
  return digits;
};

const validatePhoneNo = (phoneNo) => {
  if (!phoneNo) return null;
  if (!/^\d{10}$/.test(phoneNo)) {
    return "Phone number must be exactly 10 digits";
  }
  return null;
};

const toPublicMember = (row) => ({
  _id: row._id,
  name: row.displayName,
  designation: row.designation,
  photo: row.photo
});

const toPublicMemberDetail = (row) => {
  const item = {
    _id: row._id,
    name: row.displayName,
    designation: row.designation,
    photo: row.photo
  };
  if (row.email) item.email = row.email;
  if (row.phoneNo) item.phoneNo = row.phoneNo;
  if (row.description) item.description = row.description;
  return item;
};

const paginateMembers = async (cardId, page, limit) => {
  const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;
  const filter = { cardId };

  const [rows, total] = await Promise.all([
    AboutUsCardMember.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
    AboutUsCardMember.countDocuments(filter)
  ]);

  return {
    rows,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: total > 0 ? Math.ceil(total / limitNum) : 0
    }
  };
};

export const getCardMembers = async (req, res) => {
  try {
    const card = await ensureParentCard(req.params.cardId);
    if (!card) return res.status(404).json({ success: false, message: "Card not found" });

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;
    const filter = { cardId: card._id };

    const [rows, total] = await Promise.all([
      AboutUsCardMember.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("displayName designation photo")
        .lean(),
      AboutUsCardMember.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: rows.map(toPublicMember),
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

export const getCardMembersAdmin = async (req, res) => {
  try {
    const card = await ensureParentCard(req.params.cardId);
    if (!card) return res.status(404).json({ success: false, message: "Card not found" });

    const { rows, pagination } = await paginateMembers(
      card._id,
      req.query.page,
      req.query.limit
    );

    res.status(200).json({
      success: true,
      data: rows,
      pagination
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCardMemberById = async (req, res) => {
  try {
    const row = await AboutUsCardMember.findOne({
      _id: req.params.memberId,
      cardId: req.params.cardId
    })
      .select("displayName designation photo email phoneNo description")
      .lean();

    if (!row) return res.status(404).json({ success: false, message: "Member not found" });
    res.status(200).json({ success: true, data: toPublicMemberDetail(row) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCardMemberByIdAdmin = async (req, res) => {
  try {
    const row = await AboutUsCardMember.findOne({
      _id: req.params.memberId,
      cardId: req.params.cardId
    }).lean();

    if (!row) return res.status(404).json({ success: false, message: "Member not found" });
    res.status(200).json({ success: true, data: row });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCardMember = async (req, res) => {
  try {
    const card = await ensureParentCard(req.params.cardId);
    if (!card) return res.status(404).json({ success: false, message: "Card not found" });

    const displayName = extractString(req.body.displayName);
    const designation = extractString(req.body.designation);
    const photo = extractString(req.body.photo);
    const email = extractString(req.body.email);
    const phoneNo = normalizePhoneNo(req.body.phoneNo);
    const description = extractString(req.body.description);

    if (!displayName) {
      return res.status(400).json({ success: false, message: "Display name is required" });
    }
    if (!designation) {
      return res.status(400).json({ success: false, message: "Designation is required" });
    }
    if (!photo) {
      return res.status(400).json({ success: false, message: "Photo is required" });
    }
    const phoneError = validatePhoneNo(phoneNo);
    if (phoneError) {
      return res.status(400).json({ success: false, message: phoneError });
    }

    const data = await AboutUsCardMember.create({
      cardId: card._id,
      displayName,
      designation,
      photo,
      email,
      phoneNo,
      description
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCardMember = async (req, res) => {
  try {
    const update = {};

    if (req.body.displayName !== undefined) {
      const displayName = extractString(req.body.displayName);
      if (!displayName) {
        return res.status(400).json({ success: false, message: "Display name is required" });
      }
      update.displayName = displayName;
    }
    if (req.body.designation !== undefined) {
      const designation = extractString(req.body.designation);
      if (!designation) {
        return res.status(400).json({ success: false, message: "Designation is required" });
      }
      update.designation = designation;
    }
    if (req.body.photo) update.photo = extractString(req.body.photo);
    if (req.body.email !== undefined) update.email = extractString(req.body.email);
    if (req.body.phoneNo !== undefined) {
      const phoneNo = normalizePhoneNo(req.body.phoneNo);
      const phoneError = validatePhoneNo(phoneNo);
      if (phoneError) {
        return res.status(400).json({ success: false, message: phoneError });
      }
      update.phoneNo = phoneNo;
    }
    if (req.body.description !== undefined) update.description = extractString(req.body.description);

    const data = await AboutUsCardMember.findOneAndUpdate(
      { _id: req.params.memberId, cardId: req.params.cardId },
      update,
      { new: true, runValidators: true }
    );
    if (!data) return res.status(404).json({ success: false, message: "Member not found" });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCardMember = async (req, res) => {
  try {
    const data = await AboutUsCardMember.findOneAndDelete({
      _id: req.params.memberId,
      cardId: req.params.cardId
    });
    if (!data) return res.status(404).json({ success: false, message: "Member not found" });
    res.status(200).json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
