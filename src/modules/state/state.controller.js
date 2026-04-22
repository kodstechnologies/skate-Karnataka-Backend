import { asyncHandler } from "../../util/common/asyncHandler.js";
import { ApiResponse } from "../../util/common/ApiResponse.js";
import {
  createStateService,
  deleteStateService,
  displayAllStateService,
  displaySingleStateAllDistrictsService,
  updateStateService,
} from "./state.service.js";

const displayAllState = asyncHandler(async(req , res) =>{
    const states = await displayAllStateService();
    return res.status(200).json(new ApiResponse(200, states, "All states fetched successfully"));
});

const createNewState = asyncHandler(async(req , res) =>{
    await createStateService(req.body);
    return res.status(201).json(new ApiResponse(201, null, "State created successfully"));
});

const displaySingleStateAllDistricts = asyncHandler(async( req , res) =>{
    const { id } = req.params;
    const state = await displaySingleStateAllDistrictsService(id);
    return res.status(200).json(new ApiResponse(200, state, "State details fetched successfully"));
});

const updateState = asyncHandler(async(req, res) =>{
    const { id } = req.params;
    await updateStateService(id, req.body);
    return res.status(200).json(new ApiResponse(200, null, "State updated successfully"));
});

const deleteState = asyncHandler(async(req, res) =>{
    const { id } = req.params;
    await deleteStateService(id);
    return res.status(200).json(new ApiResponse(200, null, "State deleted successfully"));
});

export  {
    displayAllState,
    createNewState,
    displaySingleStateAllDistricts,
    updateState,
    deleteState
}