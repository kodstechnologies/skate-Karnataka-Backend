import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import { acceptClubService, createNewDistrictService, displayDashboardData, displayTotalClubsService, districtDeletedService, getAllDistrictService, leaveClubService, rejectClubService, singleDistrictAllClubNameService, singleDistrictSkatersService, updateDistrictService } from "./district.service.js";

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
  const result = await leaveClubService({ clubId });

  return res.status(200).json(
    new ApiResponse(200, null, "Club leave application accepted")
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

const displaySingleDistrictMembers = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const districtMembers = await singleDistrictSkatersService(id);

  return res.status(200).json(
    new ApiResponse(200, districtMembers, "District skater members fetched successfully")
  );
});

const displayTotalClubs = asyncHandler(async (req, res) => {

  const districtId = req.user?._id;
  const clubsData = await displayTotalClubsService(districtId);

  return res.status(200).json(
    new ApiResponse(200, clubsData, "District clubs fetched successfully")
  );
});

export const displayDistrictDashboard = asyncHandler(async(req, res) =>{
    const districtId = req.user?._id;
  const dashboardData = await displayDashboardData(districtId);

  return res.status(200).json(
    new ApiResponse(200, dashboardData, "District district dashboard details successfully")
  );
})

export {
  displayAllDistrict,
  createNewDistrict,
  displaySingleDistrictAllClubs,
  updateDistrict,
  deleteDistrict,
  acceptClub,
  leaveClub,
  rejectClub,
  displaySingleDistrictMembers,
  displayTotalClubs
}