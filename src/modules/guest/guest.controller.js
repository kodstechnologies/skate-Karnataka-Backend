import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import {
  addContactUsService,
  addFeedBackService,
  addNewsService,
  afterLoginFormGuestService,
  deleteNewsService,
  displayContactUsService,
  displayFeedbackService,
  displayNewsService,
  displaySingleNewsService,
  updateNewsService,
} from "./guest.services.js";

export const afterLoginGuestForm = asyncHandler(async (req, res) => {
    console.log(req.body, "jjj")
    const { id } = req.params;
    await afterLoginFormGuestService(req.body, id);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                null,
                "Guest from submitted successfully"
            )
        )
})


export const displayContactUs = asyncHandler(async (req, res) => {
    const result = await displayContactUsService();
    return res.status(200).json(new ApiResponse(
        200, result, "Display contact us"
    ))
})

export const addContactUs = asyncHandler(async (req, res) => {
    await addContactUsService(req.body)

    return res.status(200).json(new ApiResponse(
        200, null, "Add contact us successfully"
    ))
})

export const displayFeedback = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const result = await displayFeedbackService({ page, limit });
    return res.status(200).json(
        new ApiResponse(200, result, "Feedback fetched successfully")
    );
});

export const addFeedBack = asyncHandler(async (req, res) => {
    await addFeedBackService(req.body);
    return res.status(201).json(
        new ApiResponse(201, null, "Feedback added successfully")
    );
});

export const displayNews = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const result = await displayNewsService({ page, limit });
    return res.status(200).json(
        new ApiResponse(200, result, "News fetched successfully")
    );
});

export const addNews = asyncHandler(async (req, res) => {
    await addNewsService(req.body);
    return res.status(201).json(
        new ApiResponse(201, null, "News added successfully")
    );
});

export const displaySingleNews = asyncHandler(async (req, res) => {
    const result = await displaySingleNewsService(req.params.id);
    return res.status(200).json(
        new ApiResponse(200, result, "Single news fetched successfully")
    );
});

export const updateNews = asyncHandler(async (req, res) => {
    const result = await updateNewsService(req.params.id, req.body);
    return res.status(200).json(
        new ApiResponse(200, result, "News updated successfully")
    );
});

export const deleteNews = asyncHandler(async (req, res) => {
    const result = await deleteNewsService(req.params.id);
    return res.status(200).json(
        new ApiResponse(200, result, "News deleted successfully")
    );
});