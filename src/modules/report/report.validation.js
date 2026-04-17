import Joi from "joi";

const create_report_validation = {
    body: Joi.object({
        reportType: Joi.string().required(),
        message: Joi.string().required(),
        clubName: Joi.string().allow(""),
        skaterName: Joi.string().allow(""),
        districtName: Joi.string().allow(""),
        krsaId: Joi.string().allow(""),
    }),
}

export {
    create_report_validation
}