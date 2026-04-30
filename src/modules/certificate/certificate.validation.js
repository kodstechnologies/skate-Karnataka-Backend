import Joi from "joi";

const createCertificateValidation = {
    body: Joi.object({
        winnerKRSAId: Joi.string().required(),
    })
}

export {
    createCertificateValidation
}