import Joi from "joi";

const afterLoginClubFormValidation = {
    body: Joi.object({

        clubName: Joi.string().trim(),
        ROSNumber: Joi.string().trim().allow(""),
        district: Joi.string().trim(),
        RegistrationAddress: Joi.string().trim(),

        presidentName: Joi.string().trim(),
        presidentNumber: Joi.string().pattern(/^[0-9]{10}$/),

        secretaryName: Joi.string().trim(),
        secretaryNumber: Joi.string().pattern(/^[0-9]{10}$/),

        tenacitySkaters: Joi.string(),
        recreationalSkaters: Joi.string(),
        QuadSkaters: Joi.string(),
        ProInlineSkaters: Joi.string(),

        trackAddress: Joi.string().trim(),
        trackMeasurements: Joi.string().trim(),
        // numberOfTrainers: Joi.number().integer().min(0),

        noOfTrainers: Joi.string(),
        trainerCertification: Joi.string().trim().allow(""),

        documents: Joi.array().items(
            Joi.object({
                url: Joi.string().uri().allow(""),
                name: Joi.string().allow(""),
            })
        ),
    }).min(1), // ✅ at least one field required
};

export {
    afterLoginClubFormValidation
}