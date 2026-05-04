import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";

const normalizeAboutPayload = (body) => {
  if (body.img != null && typeof body.img === "string") {
    body.img = [body.img];
  }
  return body;
};
import {
  addContactUsService,
  addFeedBackService,
  addNewsService,
  addAboutService,
  addCircularService,
  addDisciplineService,
  addSponsorshipDonationService,
  afterLoginFormGuestService,
  deleteAboutService,
  deleteCircularService,
  deleteDisciplineService,
  deleteNewsService,
  deleteSponsorshipDonationService,
  displayAboutGuestService,
  displayCircularService,
  displayLatestAboutService,
  displaySingleCircularService,
  displayContactUsService,
  displayDisciplinesService,
  displaySingleDisciplineService,
  displayFeedbackService,
  displayNewsService,
  displaySponsorshipDonationsService,
  displayStateLatestEventsService,
  displayStateLatestSingleEventsService,
  displaySingleNewsService,
  displaySingleSponsorshipDonationService,
  updateAboutService,
  updateCircularService,
  updateDisciplineService,
  updateNewsService,
  updateSponsorshipDonationService,
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
    const { page = 1, limit = 10, search } = req.query;
    const result = await displayFeedbackService({ page, limit, search });
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
    const { page = 1, limit = 10, search } = req.query;
    const result = await displayNewsService({ page, limit, search });
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

export const displayStateLatestEvents = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const result = await displayStateLatestEventsService({ page, limit });
    return res.status(200).json(
        new ApiResponse(200, result, "State events fetched successfully")
    );
});

export const displayStateLatestSingleEvents = asyncHandler(async (req, res) => {
    const result = await displayStateLatestSingleEventsService(req.params.id);
    return res.status(200).json(
        new ApiResponse(200, result, "State event details fetched successfully")
    );
});


export const displayDisciplines = asyncHandler(async(req, res) =>{
    const { page = 1, limit = 10, search } = req.query;
    const result = await displayDisciplinesService({ page, limit, search });
    return res.status(200).json(
        new ApiResponse(200, result, "Disciplines fetched successfully")
    );
});

export const displaySingleDiscipline = asyncHandler(async (req, res) => {
    const result = await displaySingleDisciplineService(req.params.id);
    return res.status(200).json(
        new ApiResponse(200, result, "Discipline fetched successfully")
    );
});

export const addDiscipline = asyncHandler(async(req, res) =>{
    await addDisciplineService(req.body);
    return res.status(201).json(
        new ApiResponse(201, null, "Discipline added successfully")
    );
});
export const updateDiscipline = asyncHandler(async(req, res) =>{
    const result = await updateDisciplineService(req.params.id, req.body);
    return res.status(200).json(
        new ApiResponse(200, result, "Discipline updated successfully")
    );
});
export const deleteDiscipline = asyncHandler(async(req, res) =>{
    const result = await deleteDisciplineService(req.params.id);
    return res.status(200).json(
        new ApiResponse(200, result, "Discipline deleted successfully")
    );
});

export const displayCircular = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search } = req.query;
    const result = await displayCircularService({ page, limit, search });
    return res.status(200).json(
        new ApiResponse(200, result, "Circular fetched successfully")
    );
});

export const displaySingleCircular = asyncHandler(async (req, res) => {
    const result = await displaySingleCircularService(req.params.id);
    return res.status(200).json(
        new ApiResponse(200, result, "Single circular fetched successfully")
    );
});

export const addCircular = asyncHandler(async (req, res) => {
    await addCircularService(req.body);
    return res.status(201).json(
        new ApiResponse(201, null, "Circular added successfully")
    );
});

export const updateCircular = asyncHandler(async (req, res) => {
    const result = await updateCircularService(req.params.id, req.body);
    return res.status(200).json(
        new ApiResponse(200, result, "Circular updated successfully")
    );
});

export const deleteCircular = asyncHandler(async (req, res) => {
    const result = await deleteCircularService(req.params.id);
    return res.status(200).json(
        new ApiResponse(200, result, "Circular deleted successfully")
    );
});

export const displayLatestAbout = asyncHandler(async (req, res) => {
    const result = await displayLatestAboutService();
    return res.status(200).json(
        new ApiResponse(200, result, "Latest about fetched successfully")
    );
});

export const displayAboutGuest = asyncHandler(async (req, res) => {
    const result = await displayAboutGuestService();
    return res.status(200).json(
        new ApiResponse(200, result, "About preview fetched successfully")
    );
});

export const addAbout = asyncHandler(async (req, res) => {
    await addAboutService(normalizeAboutPayload(req.body));
    return res.status(201).json(
        new ApiResponse(201, null, "About added successfully")
    );
});

export const editAbout = asyncHandler(async (req, res) => {
    const result = await updateAboutService(normalizeAboutPayload(req.body));
    return res.status(200).json(
        new ApiResponse(200, result, "About updated successfully")
    );
});

export const deleteAbout = asyncHandler(async (req, res) => {
    const result = await deleteAboutService();
    return res.status(200).json(
        new ApiResponse(200, result, "All about records deleted successfully")
    );
});

export const displaySponsorshipDonations = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search, supportType } = req.query;
    const result = await displaySponsorshipDonationsService({ page, limit, search, supportType });
    return res.status(200).json(
        new ApiResponse(200, result, "Sponsorship/Donation records fetched successfully")
    );
});

export const addSponsorshipDonation = asyncHandler(async (req, res) => {
    const payload = { ...req.body };
    if (Array.isArray(payload.img)) {
        payload.img = payload.img[0] || "";
    }
    const created = await addSponsorshipDonationService(payload);
    return res.status(201).json(
        new ApiResponse(201, created, "Sponsorship/Donation record added successfully")
    );
});

export const displaySingleSponsorshipDonation = asyncHandler(async (req, res) => {
    const result = await displaySingleSponsorshipDonationService(req.params.id);
    return res.status(200).json(
        new ApiResponse(200, result, "Sponsorship/Donation record fetched successfully")
    );
});

export const updateSponsorshipDonation = asyncHandler(async (req, res) => {
    const payload = { ...req.body };
    if (Array.isArray(payload.img)) {
        payload.img = payload.img[0] || "";
    }
    const result = await updateSponsorshipDonationService(req.params.id, payload);
    return res.status(200).json(
        new ApiResponse(200, result, "Sponsorship/Donation record updated successfully")
    );
});

export const deleteSponsorshipDonation = asyncHandler(async (req, res) => {
    const result = await deleteSponsorshipDonationService(req.params.id);
    return res.status(200).json(
        new ApiResponse(200, result, "Sponsorship/Donation record deleted successfully")
    );
});