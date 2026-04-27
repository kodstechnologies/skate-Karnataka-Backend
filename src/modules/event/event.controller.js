import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import { clubRelatedEventDisplayService, createClubEventService, createDistrictEventService, createStateEventService, create_event_schema, delete_event_schema, display_all_event_based_on_user_service, display_latest_event_server, displayEventServer, displaySingleEventDetailsServer, districtRelatedEventDisplayService, edit_event_schema, stateRelatedEventDisplayService } from "./event.service.js";


const display_latest_event = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    console.log(userId, "userId")
    const result = await display_latest_event_server(userId);
    console.log(result, "result====")
    return res.status(200).json(
        new ApiResponse(
            200,
            result,
            "Events fetched successfully"
        )
    );
})

// =============================== club  

export const clubRelatedEventDisplay = asyncHandler(async (req, res) => {
    const clubId = req.user._id;
    const { page = 1, limit = 10 } = req.query;
    const events = await clubRelatedEventDisplayService(clubId, { page, limit });
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                data: events.data || [],
                pagination: {
                    total: events.total || 0,
                    page: events.page || Number(page) || 1,
                    limit: events.limit || Number(limit) || 10,
                    totalPages: events.totalPages || 0,
                },
            },
            "Display pending approver"
        )
    )
})

export const createClubEvent = asyncHandler(async (req, res) => {
    console.log(req.body ,"=====")
    const clubId = req.user._id;
    const event = await createClubEventService(clubId, req.body);

    return res.status(201).json(
        new ApiResponse(
            201,
            event,
            "Club event created successfully"
        )
    );
});

// district ================================

export const districtRelatedEventDisplay = asyncHandler(async (req, res) => {
    const districtUserId = req.user._id;
    const { page = 1, limit = 10 } = req.query;
    const events = await districtRelatedEventDisplayService(districtUserId, { page, limit });
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                data: events.data || [],
                pagination: {
                    total: events.total || 0,
                    page: events.page || Number(page) || 1,
                    limit: events.limit || Number(limit) || 10,
                    totalPages: events.totalPages || 0,
                },
            },
            "Display pending approver"
        )
    )
})

export const createDistrictEvent = asyncHandler(async (req, res) => {
    console.log(req.body ,"=====")
    const districtUserId = req.user._id;
    const event = await createDistrictEventService(districtUserId, req.body);

    return res.status(201).json(
        new ApiResponse(
            201,
            event,
            "District event created successfully"
        )
    );
});

// ===================================== state 

export const stateRelatedEventDisplay = asyncHandler(async (req, res) => {
    const stateId = req.user._id;
    const { page = 1, limit = 10 } = req.query;
    const events = await stateRelatedEventDisplayService(stateId, { page, limit });
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                data: events.data || [],
                pagination: {
                    total: events.total || 0,
                    page: events.page || Number(page) || 1,
                    limit: events.limit || Number(limit) || 10,
                    totalPages: events.totalPages || 0,
                },
            },
            "Display pending approver"
        )
    )
});

export const createStateEvent = asyncHandler(async (req, res) => {
    const stateId = req.user._id;
    const event = await createStateEventService(stateId, req.body);

    return res.status(201).json(
        new ApiResponse(
            201,
            event,
            "State event created successfully"
        )
    );
});


// =====================================
const display_all_event_based_on_user = asyncHandler(async (req, res) => {
    console.log("jjjj")
    const userId = req.user._id; // assuming auth middleware
    const { page, limit } = req.query;

    const userBasedEvents = await display_all_event_based_on_user_service(userId, { page, limit });

    return res.status(200).json(
        new ApiResponse(
            200,
            userBasedEvents,
            "All user-based events fetched successfully"
        )
    );
});
const create_event = asyncHandler(async (req, res) => {
    console.log(req.body, "bnody")
    await create_event_schema(req.body);

    return res.status(200).json(
        new ApiResponse(
            201,
            null,
            "Event created successfully"
        )
    )
})

const edit_event = asyncHandler(async (req, res) => {

    const { id } = req.params;
    await edit_event_schema(id, req.body);

    return res.status(200).json(
        new ApiResponse(
            201,
            null,
            "Event updated successfully"
        )
    )
})

const delete_event = asyncHandler(async (req, res) => {
    const { id } = req.params();
    await delete_event_schema(id);

    return res.status(200).json(
        200,
        null,
        "Event deleted successfully"
    )
})

const displayAllEvents = asyncHandler(async (req, res) => {

    const result = await displayEventServer(req.query);

    return res.status(200).json(
        new ApiResponse(
            200,
            result,
            "Events fetched successfully"
        )
    );
});

const displayEventById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const event = await displaySingleEventDetailsServer(id);
    console.log("🚀 ~ result:", event)
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                event,
                "Event displayed successfully"
            )
        );
});



export {
    displayAllEvents,
    displayEventById,
    display_latest_event,
    display_all_event_based_on_user,
    create_event,
    edit_event,
    delete_event
}