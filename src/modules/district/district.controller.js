import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import { AppError } from "../../util/common/AppError.js";
import { BaseAuth } from "../auth/baseAuth.model.js";
import { acceptClubService, createNewDistrictService, displayAllApplyService, displayApplyAllClubService, displayDashboardData, displayDistrictProfileServices, displaySkaterDetailsService, displayTotalClubsService, displayTotalSkatersService, districtClubDetailsService, districtClubSkatersService, districtDeletedService, districtUnLinkClubService, getAllDistrictService, leaveClubService, rejectClubLeaveService, rejectClubService, singleDistrictAllClubNameService, singleDistrictSkatersService, updateDistrictProfileService, updateDistrictService } from "./district.service.js";
import { approve_join_club_service, approve_leave_club_service, reject_join_club_service, reject_leave_club_service } from "../club/club.service.js";

const displayAllDistrict = asyncHandler(async (req, res) => {
  const districts = await getAllDistrictService();

  return res.status(200).json(
    new ApiResponse(
      200,
      districts,
      "All districts fetched successfully"
    )
  );
});
const createNewDistrict = asyncHandler(async (req, res) => {
  await createNewDistrictService(req.body);
  return res.status(201).json(
    new ApiResponse(
      201,
      null,
      "District created successfully"
    )
  )
})

const displaySingleDistrictAllClubs = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const districtClubs = await singleDistrictAllClubNameService(id);
  return res.status(200).json(
    new ApiResponse(
      200,
      districtClubs,
      `Display ${districtClubs.name} district all clubs`
    )
  )
})

const updateDistrict = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await updateDistrictService(id, req.body);
  return res.status(200).json(
    new ApiResponse(
      200,
      null,
      "District details updated successfully"
    )
  )
})

const deleteDistrict = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await districtDeletedService(id);
  return res.status(200).json(
    new ApiResponse(
      200,
      null,
      "District deleted successfully"
    )
  )
})

const acceptClub = asyncHandler(async (req, res) => {
  const { id: clubId } = req.params;
  const districtId = req.user?._id;
  const result = await acceptClubService({ clubId, districtId });

  return res.status(200).json(
    new ApiResponse(200, null, "Club district application accepted")
  );
});

const leaveClub = asyncHandler(async (req, res) => {
  const { id: clubId } = req.params;
  const result = await leaveClubService({
    clubId,
    districtMemberId: req.user?._id,
  });

  return res.status(200).json(
    new ApiResponse(200, result, "Club leave application accepted")
  );
});

const rejectClub = asyncHandler(async (req, res) => {
  const { id: clubId } = req.params;
  const districtId = req.user?._id;
  const result = await rejectClubService({ clubId, districtId });

  return res.status(200).json(
    new ApiResponse(200, result, "Club district application rejected")
  );
});

const rejectLeaveClub = asyncHandler(async (req, res) => {
  const { id: clubId } = req.params;
  const result = await rejectClubLeaveService({
    clubId,
    districtMemberId: req.user?._id,
  });

  return res.status(200).json(
    new ApiResponse(200, result, "Club leave request rejected; affiliation restored")
  );
});

const displaySingleDistrictMembers = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const districtMembers = await singleDistrictSkatersService(id);

  return res.status(200).json(
    new ApiResponse(200, districtMembers, "District skater members fetched successfully")
  );
});

const displayTotalClubs = asyncHandler(async (req, res) => {
  const districtId = req.user?._id;
  const { page = 1, limit = 10, search = "" } = req.query;
  const clubsData = await displayTotalClubsService(districtId, { page, limit, search });

  return res.status(200).json(
    new ApiResponse(200, clubsData, "District clubs fetched successfully")
  );
});

const displayTotalSkater = asyncHandler(async (req, res) => {
  const districtId = req.user?._id;
  const { page = 1, limit = 10, search = "" } = req.query;
  const skaterData = await displayTotalSkatersService(districtId, { page, limit, search });

  return res.status(200).json(
    new ApiResponse(200, skaterData, "District skaters fetched successfully")
  );
});

const displayAllApply = asyncHandler(async (req, res) => {
  const districtMemberId = req.user?._id;
  const { page = 1, limit = 10 } = req.query;
  const result = await displayAllApplyService(districtMemberId, { page, limit });

  return res.status(200).json(
    new ApiResponse(200, result, "District applied clubs fetched successfully")
  );
});

export const displayApplyAllClub = asyncHandler(async (req, res) => {
  const districtMemberId = req.user?._id;
  const { page = 1, limit = 10 } = req.query;
  const result = await displayApplyAllClubService(districtMemberId, {
    page,
    limit,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      result,
      "District pending approvals fetched successfully"
    )
  );
});

const districtClubDetails = asyncHandler(async (req, res) => {
  const { id: clubId } = req.params;
  const result = await districtClubDetailsService({
    clubId,
    districtMemberId: req.user?._id,
  });

  return res.status(200).json(
    new ApiResponse(200, result, "Club details fetched successfully")
  );
});

const displayDistrictClubSkaters = asyncHandler(async (req, res) => {
  const districtMemberId = req.user?._id;
  const { id: clubId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const result = await districtClubSkatersService(districtMemberId, clubId, {
    page: Number(page),
    limit: Number(limit),
  });

  return res.status(200).json(
    new ApiResponse(200, result, "Club skaters fetched successfully")
  );
});

const displaySkaterDetails = asyncHandler(async (req, res) => {
  const { id: skaterId } = req.params;
  const result = await displaySkaterDetailsService(skaterId, req.user?._id);

  return res.status(200).json(
    new ApiResponse(200, result, "Skater details fetched successfully")
  );
});

export const displayDistrictProfile = asyncHandler(async(req,res) =>{
  const districtId = req.user?._id;
  const dashboardData = await displayDistrictProfileServices(districtId);

   return res.status(200).json(
    new ApiResponse(200, dashboardData, "Display profile details successfully")
  );
})

export const updateDistrictProfile = asyncHandler(async (req, res) => {
  const result = await updateDistrictProfileService(req.user?._id, req.body);

  return res.status(200).json(
    new ApiResponse(200, result, "District profile updated successfully")
  );
});

export const districtUnLinkClub = asyncHandler(async(req,res) =>{
  const districtMemberId = req.user?._id;
  const { id: clubId } = req.params;
  const result = await districtUnLinkClubService({ districtMemberId, clubId });

  return res.status(200).json(
    new ApiResponse(200, result, "Club unlinked from district successfully")
  );
})

export const displayDistrictDashboard = asyncHandler(async(req, res) =>{
    const districtId = req.user?._id;
  const dashboardData = await displayDashboardData(districtId);

  return res.status(200).json(
    new ApiResponse(200, dashboardData, "District district dashboard details successfully")
  );
})

// Skater join/leave approval functions for district
const acceptJoinSkater = asyncHandler(async (req, res) => {
  const { id: skaterId, clubId } = req.params;
  const districtMemberId = req.user?._id;
  
  const result = await approve_join_club_service(skaterId, clubId);

  return res.status(200).json(
    new ApiResponse(200, result, "Skater join request accepted")
  );
});

const rejectJoinSkater = asyncHandler(async (req, res) => {
  const { id: skaterId, clubId } = req.params;
  const districtMemberId = req.user?._id;
  
  const result = await reject_join_club_service(skaterId, clubId);

  return res.status(200).json(
    new ApiResponse(200, result, "Skater join request rejected")
  );
});

const acceptLeaveSkater = asyncHandler(async (req, res) => {
  const { id: skaterId, clubId } = req.params;
  const districtMemberId = req.user?._id;
  
  const result = await approve_leave_club_service(skaterId, clubId);

  return res.status(200).json(
    new ApiResponse(200, result, "Skater leave request accepted")
  );
});

const rejectLeaveSkater = asyncHandler(async (req, res) => {
  const { id: skaterId, clubId } = req.params;
  const districtMemberId = req.user?._id;
  
  const result = await reject_leave_club_service(skaterId, clubId);

  return res.status(200).json(
    new ApiResponse(200, result, "Skater leave request rejected")
  );
});

const blockDistrictSkater = asyncHandler(async (req, res) => {
  const { id: skaterId } = req.params;
  const { isBlocked } = req.body;
  if (typeof isBlocked !== "boolean") {
    throw new AppError("isBlocked must be a boolean", 400);
  }
  const updated = await BaseAuth.findByIdAndUpdate(
    skaterId,
    { isBlocked },
    { new: true, runValidators: false }
  ).select("_id fullName isBlocked").lean();
  if (!updated) throw new AppError("Skater not found", 404);
  return res.status(200).json(
    new ApiResponse(200, updated, isBlocked ? "Skater blocked" : "Skater unblocked")
  );
});

const deleteDistrictSkater = asyncHandler(async (req, res) => {
  const { id: skaterId } = req.params;
  const deleted = await BaseAuth.findByIdAndDelete(skaterId).lean();
  if (!deleted) throw new AppError("Skater not found", 404);
  return res.status(200).json(
    new ApiResponse(200, null, "Skater deleted successfully")
  );
});

const editDistrictSkater = asyncHandler(async (req, res) => {
  const districtMemberId = req.user._id;
  const { id: skaterId } = req.params;
  const { editDistrictSkaterService } = await import("./district.service.js");
  const result = await editDistrictSkaterService(skaterId, districtMemberId, req.body);
  return res.status(200).json(new ApiResponse(200, result, "Skater updated successfully"));
});

export {
  displayAllDistrict,
  createNewDistrict,
  displaySingleDistrictAllClubs,
  updateDistrict,
  deleteDistrict,
  acceptClub,
  leaveClub,
  rejectClub,
  rejectLeaveClub,
  displaySingleDistrictMembers,
  displayTotalClubs,
  displayTotalSkater,
  displayAllApply,
  districtClubDetails,
  displayDistrictClubSkaters,
  displaySkaterDetails,
  blockDistrictSkater,
  deleteDistrictSkater,
  editDistrictSkater,
  acceptJoinSkater,
  rejectJoinSkater,
  acceptLeaveSkater,
  rejectLeaveSkater
}