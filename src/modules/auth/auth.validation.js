import Joi from "joi";
import mongoose from "mongoose";

/**
 * REGISTER VALIDATION
 */
const RegisterValidation = {
    body: Joi.object({
        fullName: Joi.string()
            .trim()
            .min(3)
            .max(50)
            .required()
            .messages({
                "string.empty": "Full name is required",
                "string.min": "Full name must be at least 3 characters long",
                "string.max": "Full name cannot exceed 50 characters",
                "any.required": "Full name is required",
            }),

        address: Joi.string()
            .trim()
            .min(5)
            .max(200)
            .required()
            .messages({
                "string.empty": "Address is required",
                "string.min": "Address must be at least 5 characters",
                "string.max": "Address cannot exceed 200 characters",
                "any.required": "Address is required",
            }),

        district: Joi.string()
            .trim()
            .required()
            .messages({
                "string.empty": "District is required",
                "any.required": "District is required",
            }),

        gender: Joi.string()
            .valid("male", "female", "other")
            .optional()
            .messages({
                "any.only": "Gender must be male, female, or other",
            }),

        email: Joi.string()
            .email()
            .required()
            .messages({
                "string.email": "Please enter a valid email address",
                "string.empty": "Email is required",
                "any.required": "Email is required",
            }),

        phone: Joi.string()
            .pattern(/^[6-9]\d{9}$/)
            .required()
            .messages({
                "string.pattern.base": "Phone number must be a valid 10-digit Indian number",
                "string.empty": "Phone number is required",
                "any.required": "Phone number is required",
            }),

        role: Joi.string()
        // .valid("skater", "parent", "school", "academy", "officials", "guest", "admin")
        // .default("guest")
        // .messages({
        //     "any.only":
        //         "Role must be one of: skater, parent, school, academy, officials, guest, admin",
        // }),
    }),
};

const sendEmailOTPValidation = {
    body: Joi.object({
        email: Joi.string()
            .email()
            .required()
            .messages({
                "string.email": "Invalid email format",
                "any.required": "Email is required"
            }),
    }),
};

const verifyEmailOTPValidation = {
    body: Joi.object({
        email: Joi.string()
            .email()
            .required()
            .messages({
                "string.email": "Invalid email format",
                "any.required": "Email is required"
            }),

        otp: Joi.string()
            .length(4) // exactly 4 characters
            .pattern(/^[0-9]+$/) // only digits
            .required()
            .messages({
                "string.length": "OTP must be exactly 4 digits",
                "string.pattern.base": "OTP must contain only numbers",
                "any.required": "OTP is required"
            }),
    }),
};

const sendPhoneOTPValidation = {
    body: Joi.object({
        phone: Joi.string()
            .pattern(/^[6-9]\d{9}$/) // Indian mobile numbers
            .required()
            .messages({
                "string.pattern.base": "Phone must be a valid 10-digit Indian number",
                "any.required": "Phone number is required"
            }),
    }),
};

const verifyPhoneOTPValidation = {
    body: Joi.object({
        phone: Joi.string()
            .pattern(/^[6-9]\d{9}$/)
            .required()
            .messages({
                "string.pattern.base": "Phone must be a valid 10-digit Indian number",
                "any.required": "Phone number is required"
            }),

        otp: Joi.string()
            .pattern(/^\d{4}$/) // exactly 4 digits
            .required()
            .messages({
                "string.pattern.base": "OTP must be exactly 4 digits",
                "any.required": "OTP is required"
            }),
    }),
};

/**
 * LOGIN VALIDATION
 */
const LoginValidation = {
    body: Joi.object({
        identifier: Joi.string()
            .min(3)
            .max(50)
            .required()
            .messages({
                "string.base": "Identifier must be a string",
                "string.empty": "Identifier cannot be empty",
                "string.min": "Identifier must be at least 3 characters",
                "string.max": "Identifier must be at most 50 characters",
                "any.required": "Identifier is required"
            }),
    })
};
/**
 * VERIFY OTP VALIDATION
 */

const VerifyOTPValidation = {
    body: Joi.object({
        userId: Joi.string()
            .custom((value, helpers) => {
                if (!mongoose.Types.ObjectId.isValid(value)) {
                    return helpers.error("any.invalid");
                }
                return value;
            })
            .required()
            .messages({
                "any.invalid": "Invalid user ID",
                "any.required": "User ID is required"
            }),

        otp: Joi.string()
            .pattern(/^[0-9]{4}$/)
            .required()
            .messages({
                "string.pattern.base": "OTP must be exactly 4 digits",
                "any.required": "OTP is required"
            }),

        firebaseToken: Joi.string().allow("").optional()
    })
};

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

        signature: Joi.string().allow("").optional()
    })
};

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

const afterLoginGuestFormValidation = {
    body: Joi.object({
        fullName: Joi.string()
            .min(2)
            .max(100)
            .required()
            .messages({
                "string.empty": "Full name is required",
                "string.min": "Full name must be at least 2 characters",
                "any.required": "Full name is required"
            }),

        address: Joi.string()
            .max(200)
            .allow("")
            .messages({
                "string.max": "Address must be less than 200 characters"
            }),

        gender: Joi.string()
            .valid("male", "female", "other")
            .required()
            .messages({
                "any.only": "Gender must be male, female, or other",
                "any.required": "Gender is required"
            }),

        email: Joi.string()
            .email()
            .required()
            .messages({
                "string.email": "Invalid email format",
                "any.required": "Email is required"
            }),

        phone: Joi.string()
            .pattern(/^[0-9]{10}$/)
            .required()
            .messages({
                "string.pattern.base": "Phone must be a 10-digit number",
                "any.required": "Phone is required"
            }),
        interestedIn: Joi.array()
            .items(Joi.string())
            .messages({
                "array.base": "InterestedIn must be an array",
            }),
    })
};

const afterLoginParentFormValidation = {

}

const afterLoginOfficialFormValidation = {
    body: Joi.object({

        fullName: Joi.string()
            .trim()
            .min(3)
            .max(50)

            .messages({
                "string.empty": "Full name is required",
                "string.min": "Full name must be at least 3 characters long",
                "string.max": "Full name cannot exceed 50 characters",
                "any.required": "Full name is required",
            }),

        district: Joi.string()
            .pattern(/^[0-9a-fA-F]{24}$/)

            .messages({
                "string.pattern.base": "District must be a valid ObjectId",
                "any.required": "District is required",
            }),

        club: Joi.string()
            .pattern(/^[0-9a-fA-F]{24}$/)

            .messages({
                "string.pattern.base": "Club must be a valid ObjectId",
                "any.required": "Club is required",
            }),

        experience: Joi.number().min(0).max(50).messages({
            "number.base": "Experience must be a number",
        }),

        technicalTrainingCourse: Joi.string().allow(""),

        coachingExperience: Joi.string().allow(""),

        isSkater: Joi.string().allow(""),
        skaterDetails: Joi.string().allow(""),
        isOfficiating: Joi.string().allow(""),
        officiatingDetails: Joi.string().allow(""),
        conductingClasses: Joi.string().allow(""),
        conductingClassesDetails: Joi.string().allow(""),

        coaching: Joi.string().allow(""),
        officiating: Joi.string().allow(""),

        officialContactNumber: Joi.string().allow(""),
        officialEmail: Joi.string().allow(""),

    })

};

const afterLoginSchoolFormValidation = {
    body: Joi.object({
        schoolName: Joi.string().min(3).max(100),

        board: Joi.string().allow("").max(50),
        // ✅ NEW district validation
        district: Joi.string()
            .pattern(/^[0-9a-fA-F]{24}$/)
            .messages({
                "string.pattern.base": "District must be a valid ObjectId",
            }),

        // ✅ NEW address validation
        address: Joi.string().max(200).allow(""),

        principalName: Joi.string().allow("").max(100),

        schoolEmail: Joi.string().email().allow(""),

        schoolContactNumber: Joi.string()
            .pattern(/^[6-9]\d{9}$/)
            .allow(""),


        skatingInfraAvailable: Joi.string(),

        skatingInfraInfo: Joi.string().allow("").max(200),

        lookingForSkatingService: Joi.string(),

        lookingForSkatingCoach: Joi.string(),

        skatingCoachInfo: Joi.string().allow("").max(200),
        coachName: Joi.string(),
        coachGender: Joi.string(),
        coachContact: Joi.string(),
        coachCertificates: Joi.string(),
        certifiedBy: Joi.string(),
        documents: Joi.array().items(
            Joi.object({
                url: Joi.string().uri().required(),
                name: Joi.string().allow(""),
            })
        ),

    })
};



const LogoutValidation = {
    body: Joi.object({
        refreshTokens: Joi.string().required(),
        firebaseToken: Joi.string().optional()
    })
};

/**
 * REFRESH TOKEN VALIDATION
 */
const RefreshTokenValidation = {
    body: Joi.object({
        refreshToken: Joi.string().required()
    })
};

/**
 * UPDATE PROFILE VALIDATION
 */
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
    RegisterValidation,
    sendEmailOTPValidation,
    verifyEmailOTPValidation,
    sendPhoneOTPValidation,
    verifyPhoneOTPValidation,
    LoginValidation,
    VerifyOTPValidation,
    afterLoginSkaterFormValidation,
    afterLoginClubFormValidation,
    afterLoginGuestFormValidation,
    afterLoginParentFormValidation,
    afterLoginOfficialFormValidation,
    afterLoginSchoolFormValidation,
    LogoutValidation,
    RefreshTokenValidation,
    UpdateProfileValidation
}