import mongoose from "mongoose";
import Formula from "./Formula.model.js";
import { Club } from "../club/club.model.js";
import { District } from "../district/district.model.js";
import { AppError } from "../../util/common/AppError.js";
import { resolveClubIdForClubAuthUser } from "./event.repositories.js";
import { resolveDistrictOwnerIdRepositories } from "../gallery/gallery.repositories.js";

const isUnsetOrgRef = (field) => ({
  $or: [{ [field]: null }, { [field]: { $exists: false } }],
});

export const ADMIN_FORMULA_FILTER = {
  $and: [isUnsetOrgRef("club"), isUnsetOrgRef("district")],
};

export const clubFormulaFilter = (clubId) => ({
  club: new mongoose.Types.ObjectId(String(clubId)),
});

export const districtFormulaFilter = (districtId) => ({
  district: new mongoose.Types.ObjectId(String(districtId)),
});

export const resolveClubIdForFormula = async (authUser) =>
  resolveClubIdForClubAuthUser(authUser._id ?? authUser);

export const resolveDistrictIdForFormula = async (authUser) =>
  resolveDistrictOwnerIdRepositories(authUser);

export const listAdminFormulasPaginated = async ({ page = 1, limit = 10 } = {}) => {
  const currentPage = Math.max(1, Number(page) || 1);
  const perPage = Math.min(100, Math.max(1, Number(limit) || 10));
  const skip = (currentPage - 1) * perPage;

  const [data, total] = await Promise.all([
    Formula.find(ADMIN_FORMULA_FILTER)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .lean(),
    Formula.countDocuments(ADMIN_FORMULA_FILTER),
  ]);

  return {
    data,
    pagination: {
      total,
      page: currentPage,
      limit: perPage,
      totalPages: Math.ceil(total / perPage) || 0,
    },
  };
};

export const listClubFormulasPaginated = async (clubId, { page = 1, limit = 10 } = {}) => {
  const currentPage = Math.max(1, Number(page) || 1);
  const perPage = Math.min(100, Math.max(1, Number(limit) || 10));
  const skip = (currentPage - 1) * perPage;
  const filter = clubFormulaFilter(clubId);

  const [data, total] = await Promise.all([
    Formula.find(filter).sort({ createdAt: -1 }).skip(skip).limit(perPage).lean(),
    Formula.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      total,
      page: currentPage,
      limit: perPage,
      totalPages: Math.ceil(total / perPage) || 0,
    },
  };
};

const mapLightFormula = (row, source) => ({
  _id: row._id,
  formulaName: row.formulaName,
  categoryName: row.categoryName,
  source,
});

export const listAdminFormulasLight = async () => {
  const rows = await Formula.find(ADMIN_FORMULA_FILTER)
    .select("_id formulaName categoryName")
    .sort({ createdAt: -1 })
    .lean();
  return rows.map((row) => mapLightFormula(row, "admin"));
};

export const listClubFormulaOptions = async (clubId) => {
  const club = await Club.findById(clubId).select("formulaSource").lean();
  if (!club) {
    throw new AppError("Club not found", 404);
  }

  const source = club.formulaSource || "both";
  const [adminRows, clubRows] = await Promise.all([
    source === "club"
      ? []
      : Formula.find(ADMIN_FORMULA_FILTER)
          .select("_id formulaName categoryName")
          .sort({ createdAt: -1 })
          .lean(),
    source === "admin"
      ? []
      : Formula.find(clubFormulaFilter(clubId))
          .select("_id formulaName categoryName")
          .sort({ createdAt: -1 })
          .lean(),
  ]);

  return {
    formulaSource: source,
    formulas: [
      ...adminRows.map((row) => mapLightFormula(row, "admin")),
      ...clubRows.map((row) => mapLightFormula(row, "club")),
    ],
  };
};

export const getFormulaByIdOrThrow = async (id) => {
  const formula = await Formula.findById(id).lean();
  if (!formula) {
    throw new AppError("Formula not found", 404);
  }
  return formula;
};

export const assertClubOwnsFormula = (formula, clubId) => {
  if (!formula?.club || String(formula.club) !== String(clubId)) {
    throw new AppError("You can only manage formulas created by your club", 403);
  }
};

export const createAdminFormula = async (body) => {
  return Formula.create({ ...body, club: null, district: null });
};

export const createClubFormula = async (clubId, body) => {
  return Formula.create({ ...body, club: clubId, district: null });
};

export const createDistrictFormula = async (districtId, body) => {
  return Formula.create({ ...body, district: districtId, club: null });
};

export const updateAdminFormula = async (id, body) => {
  const existing = await getFormulaByIdOrThrow(id);
  if (existing.club || existing.district) {
    throw new AppError("Formula not found", 404);
  }
  const formula = await Formula.findOneAndUpdate(
    { _id: id, ...ADMIN_FORMULA_FILTER },
    body,
    { new: true, runValidators: true }
  );
  if (!formula) {
    throw new AppError("Formula not found", 404);
  }
  return formula;
};

export const updateClubFormula = async (clubId, id, body) => {
  await getFormulaByIdOrThrow(id);
  const formula = await Formula.findOneAndUpdate(
    { _id: id, ...clubFormulaFilter(clubId) },
    body,
    { new: true, runValidators: true }
  );
  if (!formula) {
    throw new AppError("Formula not found", 404);
  }
  return formula;
};

export const deleteAdminFormula = async (id) => {
  const formula = await Formula.findOneAndDelete({ _id: id, ...ADMIN_FORMULA_FILTER });
  if (!formula) {
    throw new AppError("Formula not found", 404);
  }
  return formula;
};

export const deleteClubFormula = async (clubId, id) => {
  const formula = await Formula.findOneAndDelete({
    _id: id,
    ...clubFormulaFilter(clubId),
  });
  if (!formula) {
    throw new AppError("Formula not found", 404);
  }
  return formula;
};

export const updateClubFormulaSource = async (clubId, formulaSource) => {
  const club = await Club.findByIdAndUpdate(
    clubId,
    { formulaSource },
    { new: true, runValidators: true }
  ).select("formulaSource name");
  if (!club) {
    throw new AppError("Club not found", 404);
  }
  return club;
};

export const getClubFormulaSource = async (clubId) => {
  const club = await Club.findById(clubId).select("formulaSource").lean();
  if (!club) {
    throw new AppError("Club not found", 404);
  }
  return { formulaSource: club.formulaSource || "both" };
};

export const listDistrictFormulasPaginated = async (
  districtId,
  { page = 1, limit = 10 } = {}
) => {
  const currentPage = Math.max(1, Number(page) || 1);
  const perPage = Math.min(100, Math.max(1, Number(limit) || 10));
  const skip = (currentPage - 1) * perPage;
  const filter = districtFormulaFilter(districtId);

  const [data, total] = await Promise.all([
    Formula.find(filter).sort({ createdAt: -1 }).skip(skip).limit(perPage).lean(),
    Formula.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      total,
      page: currentPage,
      limit: perPage,
      totalPages: Math.ceil(total / perPage) || 0,
    },
  };
};

export const listDistrictFormulaOptions = async (districtId) => {
  const district = await District.findById(districtId).select("formulaSource").lean();
  if (!district) {
    throw new AppError("District not found", 404);
  }

  const source = district.formulaSource || "both";
  const [adminRows, districtRows] = await Promise.all([
    source === "district"
      ? []
      : Formula.find(ADMIN_FORMULA_FILTER)
          .select("_id formulaName categoryName")
          .sort({ createdAt: -1 })
          .lean(),
    source === "admin"
      ? []
      : Formula.find(districtFormulaFilter(districtId))
          .select("_id formulaName categoryName")
          .sort({ createdAt: -1 })
          .lean(),
  ]);

  return {
    formulaSource: source,
    formulas: [
      ...adminRows.map((row) => mapLightFormula(row, "admin")),
      ...districtRows.map((row) => mapLightFormula(row, "district")),
    ],
  };
};

export const assertDistrictOwnsFormula = (formula, districtId) => {
  if (!formula?.district || String(formula.district) !== String(districtId)) {
    throw new AppError("You can only manage formulas created by your district", 403);
  }
};

export const updateDistrictFormula = async (districtId, id, body) => {
  await getFormulaByIdOrThrow(id);
  const formula = await Formula.findOneAndUpdate(
    { _id: id, ...districtFormulaFilter(districtId) },
    body,
    { new: true, runValidators: true }
  );
  if (!formula) {
    throw new AppError("Formula not found", 404);
  }
  return formula;
};

export const deleteDistrictFormula = async (districtId, id) => {
  const formula = await Formula.findOneAndDelete({
    _id: id,
    ...districtFormulaFilter(districtId),
  });
  if (!formula) {
    throw new AppError("Formula not found", 404);
  }
  return formula;
};

export const updateDistrictFormulaSource = async (districtId, formulaSource) => {
  const district = await District.findByIdAndUpdate(
    districtId,
    { formulaSource },
    { new: true, runValidators: true }
  ).select("formulaSource name");
  if (!district) {
    throw new AppError("District not found", 404);
  }
  return district;
};

export const getDistrictFormulaSource = async (districtId) => {
  const district = await District.findById(districtId).select("formulaSource").lean();
  if (!district) {
    throw new AppError("District not found", 404);
  }
  return { formulaSource: district.formulaSource || "both" };
};
