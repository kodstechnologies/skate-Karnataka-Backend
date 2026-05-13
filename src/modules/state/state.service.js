import { AppError } from "../../util/common/AppError.js";
import {
  createStateRepository,
  deleteStateRepository,
  getAllClubsByStateRepository,
  getAllDistrictsByStateRepository,
  getAllSkatersByStateRepository,
  getSkaterByIdForStateRepository,
  getAllStateRepository,
  getSingleStateWithDistrictsRepository,
  isStateExistByNameRepository,
  stateDashboardRepository,
  stateProfileRepository,
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
  return createStateRepository(payload);
};

export const displaySingleStateAllDistrictsService = async (stateId) => {
  const state = await getSingleStateWithDistrictsRepository(stateId);
  if (!state) {
    throw new AppError("State not found", 404);
  }
  return state;
};

export const updateStateService = async (stateId, payload) => {
  return updateStateRepository(stateId, payload);
};

export const deleteStateService = async (stateId) => {
  return deleteStateRepository(stateId);
};

export const displayDashboardService = async () => {
  return stateDashboardRepository();
};

export const displayProfileService = async (stateId) => {
  return stateProfileRepository(stateId);
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
