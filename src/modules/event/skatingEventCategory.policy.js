import mongoose from "mongoose";
import { AppError } from "../../util/common/AppError.js";

export const CATEGORY_STATUS = Object.freeze({
  STANDARD: "standard",
  CUSTOM: "custom",
});

const normalizeRole = (role) => String(role || "").trim().toLowerCase();

export const isStateOrAdminRole = (role) => {
  const r = normalizeRole(role);
  return r === "state" || r === "admin";
};

/** Legacy rows created before categoryStatus existed are treated as standard. */
export const legacyStandardCategoryClause = () => ({
  $or: [
    { categoryStatus: CATEGORY_STATUS.STANDARD },
    { categoryStatus: { $exists: false } },
    { categoryStatus: null },
  ],
});

/** Categories visible when creating events (standard + org custom). */
export const buildVisibleCategoriesFilter = ({ clubId = null, districtId = null } = {}) => {
  const or = [legacyStandardCategoryClause()];

  if (clubId && mongoose.Types.ObjectId.isValid(String(clubId))) {
    or.push({
      categoryStatus: CATEGORY_STATUS.CUSTOM,
      club: new mongoose.Types.ObjectId(String(clubId)),
    });
  }

  if (districtId && mongoose.Types.ObjectId.isValid(String(districtId))) {
    or.push({
      categoryStatus: CATEGORY_STATUS.CUSTOM,
      district: new mongoose.Types.ObjectId(String(districtId)),
    });
  }

  return { $or: or };
};

export const buildAdminCategoriesListFilter = (query = {}) => {
  const filter = {};
  const status = String(query.categoryStatus || "").trim().toLowerCase();
  const ownerType = String(query.ownerType || "").trim().toLowerCase();

  if (status === CATEGORY_STATUS.STANDARD || status === CATEGORY_STATUS.CUSTOM) {
    filter.categoryStatus = status;
  }

  if (ownerType === "club" && query.clubId) {
    filter.categoryStatus = CATEGORY_STATUS.CUSTOM;
    filter.club = query.clubId;
  } else if (ownerType === "district" && query.districtId) {
    filter.categoryStatus = CATEGORY_STATUS.CUSTOM;
    filter.district = query.districtId;
  }

  return filter;
};

export const resolveCategoryOwnershipForCreate = (user, body = {}) => {
  const role = normalizeRole(user?.role);

  if (role === "club") {
    if (!user?.clubDocId) {
      throw new AppError("Club not found for this account", 404);
    }
    return {
      categoryStatus: CATEGORY_STATUS.CUSTOM,
      club: user.clubDocId,
      district: null,
    };
  }

  if (role === "district") {
    if (!user?.districtDocId) {
      throw new AppError("District not found for this account", 404);
    }
    return {
      categoryStatus: CATEGORY_STATUS.CUSTOM,
      club: null,
      district: user.districtDocId,
    };
  }

  if (isStateOrAdminRole(role)) {
    const requestedStatus = String(body.categoryStatus || CATEGORY_STATUS.STANDARD)
      .trim()
      .toLowerCase();

    if (requestedStatus === CATEGORY_STATUS.CUSTOM) {
      const club = body.club || body.clubId || null;
      const district = body.district || body.districtId || null;
      if ((club && district) || (!club && !district)) {
        throw new AppError(
          "Custom categories must be linked to either a club or a district, not both",
          400
        );
      }
      return {
        categoryStatus: CATEGORY_STATUS.CUSTOM,
        club: club || null,
        district: district || null,
      };
    }

    return {
      categoryStatus: CATEGORY_STATUS.STANDARD,
      club: null,
      district: null,
    };
  }

  throw new AppError("You are not allowed to create event categories", 403);
};

export const isStandardCategory = (category) => {
  if (!category) {
    return false;
  }

  const status = category.categoryStatus;
  return !status || status === CATEGORY_STATUS.STANDARD;
};

export const assertCanMutateCategory = (user, category) => {
  if (!category) {
    throw new AppError("Event category not found", 404);
  }

  const role = normalizeRole(user?.role);
  if (isStateOrAdminRole(role)) {
    return;
  }

  if (category.categoryStatus === CATEGORY_STATUS.STANDARD) {
    throw new AppError("Only super admin can change standard categories", 403);
  }

  if (role === "club") {
    if (!user?.clubDocId || String(category.club) !== String(user.clubDocId)) {
      throw new AppError("You can only edit your club's custom categories", 403);
    }
    return;
  }

  if (role === "district") {
    if (!user?.districtDocId || String(category.district) !== String(user.districtDocId)) {
      throw new AppError("You can only edit your district's custom categories", 403);
    }
    return;
  }

  throw new AppError("You are not allowed to modify this category", 403);
};
