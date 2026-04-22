import { AppError } from "../../util/common/AppError.js";
import { District } from "../district/district.model.js";
import { State } from "./state.model.js";

export const getAllStateRepository = async () => {
  return State.find()
    .select("_id fullName phone email name img about krsaId verify")
    .sort({ createdAt: -1 })
    .lean();
};

export const isStateExistByNameRepository = async (name) => {
  return State.findOne({ name }).select("_id").lean();
};

export const createStateRepository = async (payload) => {
  return State.create(payload);
};

export const getSingleStateWithDistrictsRepository = async (stateId) => {
  const state = await State.findById(stateId)
    .select("_id fullName phone email name img about krsaId verify")
    .lean();

  if (!state) {
    return null;
  }

  // Current district schema has no state reference, so return all districts.
  const districts = await District.find()
    .select("_id name img")
    .sort({ createdAt: -1 })
    .lean();

  return {
    ...state,
    totalDistricts: districts.length,
    districts,
  };
};

export const updateStateRepository = async (stateId, payload) => {
  const updated = await State.findByIdAndUpdate(
    stateId,
    { $set: payload },
    { new: true, runValidators: true }
  )
    .select("_id fullName phone email name img about krsaId verify")
    .lean();

  if (!updated) {
    throw new AppError("State not found", 404);
  }

  return updated;
};

export const deleteStateRepository = async (stateId) => {
  const deleted = await State.findByIdAndDelete(stateId).lean();
  if (!deleted) {
    throw new AppError("State not found", 404);
  }
  return deleted;
};
