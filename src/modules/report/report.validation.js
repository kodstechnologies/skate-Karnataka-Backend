import Joi from "joi";

const reportStatusEnum = Joi.string()
    .valid("pending", "solved", "inprogress", "notSolved")
    .messages({ "any.only": "status must be pending, solved, inprogress, or notSolved" });

const objectIdString = Joi.string()
    .trim()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
        "string.pattern.base": "reportId must be a valid 24-character hex id",
    });

const create_report_validation = {
    body: Joi.object({
        reportType: Joi.string().required(),
        message: Joi.string().required(),
        clubName: Joi.string().allow(""),
        skaterName: Joi.string().allow(""),
        districtName: Joi.string().allow(""),
        krsaId: Joi.string().allow(""),
    }),
};

const update_skater_status_validation = {
    params: Joi.object({
        id: objectIdString.required(),
    }),
    body: Joi.object({
        status: reportStatusEnum.required(),
    }),
};

const update_club_report_validation = {
    params: Joi.object({
        id: objectIdString.required(),
    }),
    body: Joi.object({
        clubStatus: reportStatusEnum.required(),
        message: Joi.string().trim().max(5000).allow("").optional(),
    }),
};

const update_district_report_validation = {
    params: Joi.object({
        id: objectIdString.required(),
    }),
    body: Joi.object({
        status: reportStatusEnum.optional(),
        districtStatus: reportStatusEnum.optional(),
        message: Joi.string().trim().max(5000).allow("").optional(),
    }).or("status", "districtStatus"),
};

const update_state_report_validation = {
    params: Joi.object({
        id: objectIdString.required(),
    }),
    body: Joi.object({
        stateStatus: reportStatusEnum.required(),
        message: Joi.string().trim().max(5000).allow("").optional(),
    }),
};

export {
    create_report_validation,
    update_skater_status_validation,
    update_club_report_validation,
    update_district_report_validation,
    update_state_report_validation,
}