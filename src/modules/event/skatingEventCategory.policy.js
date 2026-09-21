import mongoose from "mongoose";
import { AppError } from "../../util/common/AppError.js";

export const CATEGORY_STATUS = Object.freeze({
  STANDARD: "standard",
  CUSTOM: "custom",
});

const normalizeRole = (role) => String(role || "").trim().toLowerCase();

/** Resolve role from Mongoose docs, plain objects, or JWT user payloads. */
export const getAuthRole = (user) => {
  if (!user) {
    return "";
  }
  if (typeof user.get === "function") {
    const fromDoc = user.get("role");
    if (fromDoc) {
      return normalizeRole(fromDoc);
    }
  }
  if (typeof user.toObject === "function") {
    const plain = user.toObject({ getters: true });
    if (plain?.role) {
      return normalizeRole(plain.role);
    }
  }
  return normalizeRole(user.role ?? user.__t ?? "");
};

export const isStateOrAdminRole = (roleOrUser) => {
  const r =
    roleOrUser && typeof roleOrUser === "object" && !Array.isArray(roleOrUser)
      ? getAuthRole(roleOrUser)
      : normalizeRole(roleOrUser);
  return r === "state" || r === "admin" || r === "superadmin";
};

/** Parent docs are containers. Legacy standalone custom docs still have categoryStatus. */
export const legacyStandardCategoryClause = () => ({
  $or: [
    { categoryStatus: CATEGORY_STATUS.STANDARD },
    { categoryStatus: { $exists: false } },
    { categoryStatus: null },
  ],
});

/** Categories visible when creating events (standard parents + org custom disciplines). */
export const buildVisibleCategoriesFilter = ({ clubId = null, districtId = null } = {}) => {
  const or = [legacyStandardCategoryClause()];

  if (clubId && mongoose.Types.ObjectId.isValid(String(clubId))) {
    const clubOid = new mongoose.Types.ObjectId(String(clubId));
    or.push({
      categoryStatus: CATEGORY_STATUS.CUSTOM,
      club: clubOid,
    });
    or.push({
      disciplines: {
        $elemMatch: {
          categoryStatus: CATEGORY_STATUS.CUSTOM,
          club: clubOid,
        },
      },
    });
  }

  if (districtId && mongoose.Types.ObjectId.isValid(String(districtId))) {
    const districtOid = new mongoose.Types.ObjectId(String(districtId));
    or.push({
      categoryStatus: CATEGORY_STATUS.CUSTOM,
      district: districtOid,
    });
    or.push({
      disciplines: {
        $elemMatch: {
          categoryStatus: CATEGORY_STATUS.CUSTOM,
          district: districtOid,
        },
      },
    });
  }

  return { $or: or };
};

export const buildAdminCategoriesListFilter = (query = {}) => {
  const filter = {};
  const status = String(query.categoryStatus || "").trim().toLowerCase();
  const ownerType = String(query.ownerType || "").trim().toLowerCase();

  if (status === CATEGORY_STATUS.STANDARD || status === CATEGORY_STATUS.CUSTOM) {
    filter["disciplines.categoryStatus"] = status;
  }

  if (ownerType === "club" && query.clubId) {
    filter["disciplines.categoryStatus"] = CATEGORY_STATUS.CUSTOM;
    filter["disciplines.club"] = query.clubId;
  } else if (ownerType === "district" && query.districtId) {
    filter["disciplines.categoryStatus"] = CATEGORY_STATUS.CUSTOM;
    filter["disciplines.district"] = query.districtId;
  }

  return filter;
};

export const resolveCategoryOwnershipForCreate = (user, body = {}) => {
  const role = getAuthRole(user);

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

export const isStandardCategory = (categoryOrDiscipline) => {
  if (!categoryOrDiscipline) {
    return false;
  }

  const status = categoryOrDiscipline.categoryStatus;
  return !status || status === CATEGORY_STATUS.STANDARD;
};

export const assertCanMutateCategory = (user, category) => {
  if (!category) {
    throw new AppError("Event category not found", 404);
  }

  const role = getAuthRole(user);
  if (isStateOrAdminRole(role)) {
    return;
  }

  throw new AppError("Only state admin can change event categories", 403);
};

export const assertCanMutateDiscipline = (user, discipline) => {
  if (!discipline) {
    throw new AppError("Discipline not found", 404);
  }

  const role = getAuthRole(user);
  if (isStateOrAdminRole(role)) {
    return;
  }

  if (isStandardCategory(discipline)) {
    throw new AppError("Only state admin can change standard disciplines", 403);
  }

  if (role === "club") {
    if (!user?.clubDocId || String(discipline.club) !== String(user.clubDocId)) {
      throw new AppError("You can only edit your club's custom disciplines", 403);
    }
    return;
  }

  if (role === "district") {
    if (!user?.districtDocId || String(discipline.district) !== String(user.districtDocId)) {
      throw new AppError("You can only edit your district's custom disciplines", 403);
    }
    return;
  }

  throw new AppError("You are not allowed to modify this discipline", 403);
};
