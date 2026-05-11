import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import {
    create_discipline_service,
    delete_discipline_service,
    get_all_discipline_service,
    get_single_discipline_service,
    update_discipline_service,
} from "./discipline.services.js";

const getAllDiscipline = asyncHandler(async (_req, res) => {
    const result = await get_all_discipline_service();
    return res
        .status(200)
        .json(new ApiResponse(200, result, "Discipline list fetched successfully"));
});

const getSingleDiscipline = asyncHandler(async (req, res) => {
    const result = await get_single_discipline_service(req.params.id);
    return res
        .status(200)
        .json(new ApiResponse(200, result, "Discipline fetched successfully"));
});

const createDiscipline = asyncHandler(async (req, res) => {
    const result = await create_discipline_service(req.body);
    return res
        .status(201)
        .json(new ApiResponse(201, result, "Discipline created successfully"));
});

const updateDiscipline = asyncHandler(async (req, res) => {
    const result = await update_discipline_service(req.params.id, req.body);
    return res
        .status(200)
        .json(new ApiResponse(200, result, "Discipline updated successfully"));
});

const deleteDiscipline = asyncHandler(async (req, res) => {
    const result = await delete_discipline_service(req.params.id);
    return res
        .status(200)
        .json(new ApiResponse(200, result, "Discipline deleted successfully"));
});

export {
    getAllDiscipline,
    getSingleDiscipline,
    createDiscipline,
    updateDiscipline,
    deleteDiscipline,
};
