import { asyncHandler } from "../../../util/common/asyncHandler.js";
import { displayEventServer, displaySingleEventdetailsServer } from "../service/event.service.js";

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
    const event = await displaySingleEventdetailsServer(req.body);
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
    displayEventById
}