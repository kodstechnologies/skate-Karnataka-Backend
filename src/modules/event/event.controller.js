import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import { create_event_schema, delete_event_schema, display_all_event_based_on_user_service, display_latest_event_server, displayEventServer, displaySingleEventDetailsServer, edit_event_schema } from "./event.service.js";


const display_latest_event = asyncHandler(async (req, res) => {
    const result = await display_latest_event_server(req.query);

    return res.status(200).json(
        new ApiResponse(
            200,
            result,
            "Events fetched successfully"
        )
    );
})


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
    console.log(req.body,"bnody")
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
    const {id} = req.params();
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
   const {id} = req.params;
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