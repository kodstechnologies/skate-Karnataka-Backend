import Joi from "joi";
import { parseDobInput } from "../../util/time/timeUtil.js";

const afterLoginSkaterFormValidation = {
    body: Joi.object({
        fullName: Joi.string().min(2).max(100),
        phone: Joi.string(),
        rsfiId: Joi.string().allow("").optional(),

        dob: Joi.any()
            .optional()
            .custom((value, helpers) => {
                if (value === undefined || value === null || value === "") {
                    return undefined;
                }
                try {
                    return parseDobInput(value);
                } catch (err) {
                    return helpers.error("any.invalid", {
                        message: err.message || "Invalid date of birth",
                    });
                }
            }),

        aadharNumber: Joi.string()
            .pattern(/^[0-9]{12}$/)
        ,

        gender: Joi.string()
            .valid("male", "female", "other")
        ,

        category: Joi.string()
            .trim()
            .pattern(/^[0-9a-fA-F]{24}$/),
        discipline: Joi.string()
            .trim()
            .pattern(/^[0-9a-fA-F]{24}$/),

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


const getSkaterResultsByEventValidation = {
    params: Joi.object({
        id: Joi.string()
            .trim()
            .pattern(/^[0-9a-fA-F]{24}$/)
            .required(),
    }),
    query: Joi.object({
        categoryName: Joi.string().trim().optional(),
        category: Joi.string().trim().optional(),
    }),
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
    getSkaterResultsByEventValidation,
    UpdateProfileValidation,
}