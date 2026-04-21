import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import { addMediaService, displayAllMediaBasedOnSkaterService } from "./gallery.services.js";

const displayAllMediaBasedOnSkater = asyncHandler(async (req, res) => {
    const id = req.user._id;
    const media = await displayAllMediaBasedOnSkaterService(id);
    return res.status(200).json(new ApiResponse(200 ,media , "Display all media successfully"));
 });

const addMedia = asyncHandler(async (req, res) => {
    console.log(req.user,"=====")
    await addMediaService(req.body);
    return res.status(200).json(new ApiResponse(200, null, "Media added successfully"));
});

export {
    displayAllMediaBasedOnSkater,
    addMedia,
}