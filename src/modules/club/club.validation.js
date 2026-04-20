import Joi from "joi"

const createClubValidation = {
    body: Joi.object({
        district: Joi.string().required(),
        name: Joi.string().required(),
        img: Joi.string().allow(""),
        address: Joi.string().required(),
        about: Joi.string().allow(""),
    })
}

const editClubValidation = {
    body: Joi.object({
        district: Joi.string(),
        name: Joi.string(),
        address: Joi.string(),
        about: Joi.string().allow(""),
    })
}


export {
    createClubValidation,
    editClubValidation
}