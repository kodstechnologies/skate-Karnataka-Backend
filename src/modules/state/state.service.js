import { AppError } from "../../util/common/AppError.js";
import {
  createStateRepository,
  deleteStateRepository,
  getAllStateRepository,
  getSingleStateWithDistrictsRepository,
  isStateExistByNameRepository,
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
