import { asyncHandler } from "../../util/common/asyncHandler.js";
import { ApiResponse } from "../../util/common/ApiResponse.js";
import {
  createStateService,
  deleteStateService,
  displayAllClubsByStateService,
  displayAllDistrictsByStateService,
  displayAllSkatersByStateService,
  displaySkaterByIdForStateService,
  displayClubByIdForStateService,
  displayClubSkatersForStateService,
  displayClubSkaterByIdForStateService,
  displayDashboardService,
  displayProfileService,
  displayAllStateService,
  displaySingleStateAllDistrictsService,
  updateStateService,
} from "./state.service.js";

export const displayDashboard = asyncHandler(async(req,res) =>{
     const dashboardData = await displayDashboardService();
     return res.status(200).json(new ApiResponse(200, dashboardData, "Display dashboard successfully"));
})

export const displayProfile = asyncHandler(async (req, res) => {
    const stateId = req.user?._id;
    const profileData = await displayProfileService(stateId);
    return res.status(200).json(new ApiResponse(200, profileData, "Display profile details successfully"));
});

const displayAllState = asyncHandler(async(req , res) =>{
    const { page, limit } = req.query;
    const result = await displayAllStateService({
      page: Number(page ?? 1),
      limit: Number(limit ?? 10),
    });
    return res.status(200).json({
      statusCode: 200,
      data: result.states,
      pagination: result.pagination,
      message: "All states fetched successfully",
      success: true,
    });
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

export const displayAllDistrictsByState = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "" } = req.query;
  const result = await displayAllDistrictsByStateService({
    page: Number(page),
    limit: Number(limit),
    search,
  });

  return res.status(200).json(
    new ApiResponse(200, result, "All districts fetched successfully")
  );
});

export const displayAllClubsByState = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "" } = req.query;
  const result = await displayAllClubsByStateService({
    page: Number(page),
    limit: Number(limit),
    search,
  });

  return res.status(200).json(
    new ApiResponse(200, result, "All clubs fetched successfully")
  );
});

export const displayAllSkatersByState = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search = "" } = req.query;
  const result = await displayAllSkatersByStateService({
    page: Number(page),
    limit: Number(limit),
    search,
  });

  return res.status(200).json(
    new ApiResponse(200, result, "All skaters fetched successfully")
  );
});

export const displaySkaterById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const skater = await displaySkaterByIdForStateService(id);
  return res.status(200).json(
    new ApiResponse(200, skater, "Skater details fetched successfully")
  );
});

export const displayClubById = asyncHandler(async (req, res) => {
  const { clubId } = req.params;
  console.log(clubId,"clubId==");
  const club = await displayClubByIdForStateService(clubId);
  return res.status(200).json(
    new ApiResponse(200, club, "Club details fetched successfully")
  );
});

export const displayClubSkaters = asyncHandler(async (req, res) => {
  const { clubId } = req.params;
  const { page = 1, limit = 10, search = "" } = req.query;
  const result = await displayClubSkatersForStateService(clubId, {
    page: Number(page),
    limit: Number(limit),
    search,
  });
  return res.status(200).json(
    new ApiResponse(200, result, "Club skaters fetched successfully")
  );
});

export const displayClubSkaterById = asyncHandler(async (req, res) => {
  const { clubId, skaterId } = req.params;
  const skater = await displayClubSkaterByIdForStateService(clubId, skaterId);
  return res.status(200).json(
    new ApiResponse(200, skater, "Skater details fetched successfully")
  );
});

export  {
    displayAllState,
    createNewState,
    displaySingleStateAllDistricts,
    updateState,
    deleteState
}