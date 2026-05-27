import { AppError } from "../../util/common/AppError.js";
import {
  createStateRepository,
  deleteStateRepository,
  getAllClubsByStateRepository,
  getAllDistrictsByStateRepository,
  getAllSkatersByStateRepository,
  getClubDetailByIdForStateRepository,
  getClubSkaterByIdsForStateRepository,
  getClubSkatersByClubIdForStateRepository,
  getSkaterByIdForStateRepository,
  getAllStateRepository,
  getSingleStateWithDistrictsRepository,
  isStateExistByNameRepository,
  isPhoneAlreadyRegisteredRepository,
  isEmailAlreadyRegisteredRepository,
  getStateContactRepository,
  stateDashboardRepository,
  stateProfileRepository,
  stateAccountProfileRepository,
  updateStateAccountProfileRepository,
  updateStateRepository,
} from "./state.repositories.js";

export const displayAllStateService = async ({ page, limit }) => {
  return getAllStateRepository({ page, limit });
};

export const createStateService = async (payload) => {
  const existing = await isStateExistByNameRepository(payload.name);
  if (existing) {
    throw new AppError("State already exists", 409);
  }

  const existingPhone = await isPhoneAlreadyRegisteredRepository(payload.phone);
  if (existingPhone) {
    throw new AppError("This phone number is already registered", 409);
  }

  if (payload.email) {
    const existingEmail = await isEmailAlreadyRegisteredRepository(payload.email);
    if (existingEmail) {
      throw new AppError("This email is already registered", 409);
    }
  }

  return createStateRepository({
    ...payload,
    role: "State",
  });
};

export const displaySingleStateAllDistrictsService = async (stateId) => {
  const state = await getSingleStateWithDistrictsRepository(stateId);
  if (!state) {
    throw new AppError("State not found", 404);
  }
  return state;
};

const assertUniqueStateContactOnUpdate = async (stateId, payload) => {
  const currentState = await getStateContactRepository(stateId);
  if (!currentState) {
    throw new AppError("State not found", 404);
  }

  const nextPhone =
    payload.phone !== undefined && payload.phone !== null
      ? String(payload.phone).trim()
      : null;

  // Same number on this state is allowed; block only if another account uses it
  if (nextPhone && nextPhone !== String(currentState.phone || "").trim()) {
    const existingPhone = await isPhoneAlreadyRegisteredRepository(
      nextPhone,
      stateId
    );
    if (existingPhone) {
      throw new AppError("This phone number is already registered", 409);
    }
  }

  const nextEmail =
    payload.email !== undefined && payload.email !== null
      ? String(payload.email).trim().toLowerCase()
      : null;

  if (nextEmail && nextEmail !== String(currentState.email || "").trim().toLowerCase()) {
    const existingEmail = await isEmailAlreadyRegisteredRepository(
      nextEmail,
      stateId
    );
    if (existingEmail) {
      throw new AppError("This email is already registered", 409);
    }
  }
};

export const updateStateService = async (stateId, payload) => {
  await assertUniqueStateContactOnUpdate(stateId, payload);
  return updateStateRepository(stateId, payload);
};

export const deleteStateService = async (stateId) => {
  return deleteStateRepository(stateId);
};

export const displayDashboardService = async (user) => {
  return stateDashboardRepository(user);
};

export const displayProfileService = async (stateId) => {
  return stateProfileRepository(stateId);
};

export const getStateAccountProfileService = async (stateId) => {
  return stateAccountProfileRepository(stateId);
};

export const editStateAccountProfileService = async (stateId, payload) => {
  await assertUniqueStateContactOnUpdate(stateId, payload);
  return updateStateAccountProfileRepository(stateId, payload);
};

export const displayAllDistrictsByStateService = async ({ page, limit, search }) => {
  return getAllDistrictsByStateRepository({ page, limit, search });
};

export const displayAllClubsByStateService = async ({ page, limit, search }) => {
  return getAllClubsByStateRepository({ page, limit, search });
};

export const displayAllSkatersByStateService = async ({ page, limit, search }) => {
  return getAllSkatersByStateRepository({ page, limit, search });
};

export const displaySkaterByIdForStateService = async (skaterId) => {
  const skater = await getSkaterByIdForStateRepository(skaterId);
  if (!skater) {
    throw new AppError("Skater not found", 404);
  }
  return skater;
};

export const displayClubByIdForStateService = async (clubId) => {
  const club = await getClubDetailByIdForStateRepository(clubId);
  if (!club) {
    throw new AppError("Club not found", 404);
  }
  return club;
};

export const displayClubSkatersForStateService = async (clubId, { page, limit, search }) => {
  const result = await getClubSkatersByClubIdForStateRepository(clubId, {
    page,
    limit,
    search,
  });
  if (!result) {
    throw new AppError("Club not found", 404);
  }
  return result;
};

export const displayClubSkaterByIdForStateService = async (clubId, skaterId) => {
  const skater = await getClubSkaterByIdsForStateRepository(clubId, skaterId);
  if (!skater) {
    throw new AppError("Skater not found in this club", 404);
  }
  return skater;
};
