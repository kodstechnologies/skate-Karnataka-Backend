import { asyncHandler } from "../../util/common/asyncHandler.js";
import { ApiResponse } from "../../util/common/ApiResponse.js";
import { putObject } from "../../util/aws/putObject.js";
import { afterLoginFormParentService, displayAllParentService, displayParentFullDetailsService, deleteParentService } from "./parent.services.js";
import { AppError } from "../../util/common/AppError.js";

const SKATER_FILE_FIELD_REGEX = /^skaters\[(\d+)\]\[(photo|documents)\]$/;

const uploadSkaterFilesToS3 = async (req) => {
    const uploadedFiles = Array.isArray(req?.files) ? req.files : [];
    if (!uploadedFiles.length) return;

    for (const file of uploadedFiles) {
        const match = String(file?.fieldname || "").match(SKATER_FILE_FIELD_REGEX);
        if (!match) continue;

        const skaterIndex = match[1];
        const fieldName = match[2];
        const targetKey = `skaters[${skaterIndex}][${fieldName}]`;
        const { url } = await putObject(file, "skaters");

        if (fieldName === "photo") {
            req.body[targetKey] = url;
            continue;
        }

        if (!Array.isArray(req.body[targetKey])) {
            req.body[targetKey] = [];
        }

        req.body[targetKey].push({
            url,
            name: file?.originalname || "document",
            uploadedAt: new Date(),
        });
    }
};

const afterLoginParentForm = asyncHandler(async (req, res) => {
    const { id } = req.params;
    try {
        await uploadSkaterFilesToS3(req);
    } catch (error) {
        throw new AppError(error?.message || "Failed to upload skater files", 500);
    }

    const updatedParent = await afterLoginFormParentService(req.body, id);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedParent,
                "Parent form submitted successfully"
            )
        )
})

const displayAllParent = asyncHandler(async (req, res) => {
    const parents = await displayAllParentService(req.query);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                parents,
                "Parents fetched successfully"
            )
        )
});

const displayParentFullDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const parent = await displayParentFullDetailsService(id);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                parent,
                "Parent full details fetched successfully"
            )
        );
});

const deleteParent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await deleteParentService(id);
    return res
        .status(200)
        .json(new ApiResponse(200, result, "Parent deleted successfully"));
});

export {
    afterLoginParentForm,
    displayAllParent,
    displayParentFullDetails,
    deleteParent,
}