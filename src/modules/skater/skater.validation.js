import Joi from "joi";

const afterLoginSkaterFormValidation = {
    body: Joi.object({
        fullName: Joi.string().min(2).max(100),
        phone: Joi.string(),
        rsfiId: Joi.string().allow("").optional(),

        dob: Joi.date(),

        aadharNumber: Joi.string()
            .pattern(/^[0-9]{12}$/)
        ,

        gender: Joi.string()
            .valid("male", "female", "other")
        ,

        category: Joi.string(),
        discipline: Joi.string(),

        address: Joi.string().max(200),

        district: Joi.string(), // ObjectId (string)
        club: Joi.string(),     // ObjectId (string)

        parent: Joi.string(),

        bloodGroup: Joi.string()
            .valid("A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-")
        ,

        school: Joi.string(),
        grade: Joi.string(),

        signature: Joi.string().allow("").optional(),
        photo: Joi.string().uri().optional().allow(""),
        documents: Joi.array()
            .items(
                Joi.object({
                    url: Joi.string().uri().required(),
                    name: Joi.string().optional().allow(""),
                    uploadedAt: Joi.date().optional(),
                })
            )
            .optional(),
    })
};


const UpdateProfileValidation = {
    body: Joi.object({
        fullName: Joi.string().min(3).max(50).optional(),
        dob: Joi.date().iso().optional(),
        district: Joi.string().optional(),
        email: Joi.string().email().optional(),
        photo: Joi.string().optional()
    })
};


export {
    afterLoginSkaterFormValidation,
    UpdateProfileValidation,
}