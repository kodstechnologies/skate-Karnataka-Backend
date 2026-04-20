import Joi from "joi";

const createCertificateValidation = {
    body: Joi.object({
        winnerKRSAId: Joi.string().required(),
        name: Joi.string().required(),
        division: Joi.string().required(),
    })
}

export {
    createCertificateValidation
}