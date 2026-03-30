import Joi from "joi"

const createClubValidation = {
    body: Joi.object({
        district: Joi.string().required(),
        name: Joi.string().required(),
        address: Joi.string().required(),
        about: Joi.string().allow(""),
        skaters: Joi.number().required(),
        rank: Joi.number().required(),
        championships: Joi.number().required(),
    })
}

const editClubValidation = {
    body: Joi.object({
        district: Joi.string(),
        name: Joi.string(),
        address: Joi.string(),
        about: Joi.string().allow(""),
        skaters: Joi.number(),
        rank: Joi.number(),
        championships: Joi.number(),
    })
}


export {
    createClubValidation,
    editClubValidation
}