import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import { createNewDistrictService, getAllDistrictService } from "./district.service.js";

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
            "District created sucessafully"
        )
    )
})

const displaySingleDistrictAllClubs = asyncHandler( async (req, res) =>{

})

const updateDistrict = asyncHandler( async (req, res) =>{

})

const deleteDistrict = asyncHandler( async( req, res) =>{

})

export {
    displayAllDistrict,
    createNewDistrict,
    displaySingleDistrictAllClubs,
    updateDistrict,
    deleteDistrict
}