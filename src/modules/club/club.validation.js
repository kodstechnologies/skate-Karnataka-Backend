import Joi from "joi"

const createClubValidation = {
    body: Joi.object({
        district: Joi.string().required(),
        name: Joi.string().required(),
        img: Joi.string().allow(""),
        address: Joi.string().required(),
        about: Joi.string().allow(""),
        fullName: Joi.string().trim().min(3).max(50).required(),
        phone: Joi.string()
            .trim()
            .pattern(/^[6-9]\d{9}$/)
            .required(),
        gender: Joi.string().valid("male", "female", "other").lowercase(),
        email: Joi.string().trim().email().lowercase(),
    })
}

const editClubValidation = {
    body: Joi.object({
        district: Joi.string(),
        name: Joi.string(),
        address: Joi.string(),
        about: Joi.string().allow(""),
         fullName: Joi.string().allow(""),
        phone: Joi.string().allow(""),
        gender: Joi.string().allow(""),
        email: Joi.string().allow(""),
    })
}


export {
    createClubValidation,
    editClubValidation
}