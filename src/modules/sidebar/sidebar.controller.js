import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import {
    create_sidebar_service,
    get_active_sidebar_service,
    reorder_sidebar_service,
    soft_delete_sidebar_service,
    update_sidebar_service,
} from "./sidebar.services.js";

const getActiveSidebar = asyncHandler(async (_req, res) => {
    const result = await get_active_sidebar_service();
    return res
        .status(200)
        .json(new ApiResponse(200, result, "Sidebar items fetched successfully"));
});

const createSidebar = asyncHandler(async (req, res) => {
    const result = await create_sidebar_service(req.body);
    return res
        .status(201)
        .json(new ApiResponse(201, result, "Sidebar item created successfully"));
});

const updateSidebar = asyncHandler(async (req, res) => {
    const result = await update_sidebar_service(req.params.id, req.body);
    return res
        .status(200)
        .json(new ApiResponse(200, result, "Sidebar item updated successfully"));
});

const deleteSidebar = asyncHandler(async (req, res) => {
    const result = await soft_delete_sidebar_service(req.params.id);
    return res
        .status(200)
        .json(new ApiResponse(200, result, "Sidebar item deleted successfully"));
});

const reorderSidebar = asyncHandler(async (req, res) => {
    const result = await reorder_sidebar_service(req.body);
    return res
        .status(200)
        .json(new ApiResponse(200, result, "Sidebar order updated successfully"));
});

export {
    getActiveSidebar,
    createSidebar,
    updateSidebar,
    deleteSidebar,
    reorderSidebar,
};
