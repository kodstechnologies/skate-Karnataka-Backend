import Joi from "joi";

const objectIdString = Joi.string()
    .trim()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
        "string.pattern.base": "stateId must be a valid 24-character hex id",
    });

export const stateEventListQueryValidation = {
    query: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
        stateId: objectIdString.optional(),
    }),
};

const create_event_validation = {
    body: Joi.object({
        header: Joi.string()
            .trim()
            .min(2)
            .max(50)
            .required(),

        image: Joi.string()
            .uri()
            .optional()
            .allow(""),

        date: Joi.date()
            .required(),

        about: Joi.string()
            .trim()
            .optional()
            .allow(""),

        address: Joi.string()
            .trim()
            .optional()
            .allow(""),

        eventType: Joi.string()
            .valid("State", "District", "Club")
            .required(),

        eventFor: Joi.string()
            .required(), // ObjectId (string format)
        entryFee: Joi.string().allow(""),
        colorOne: Joi.string().allow(""),
        colorTwo: Joi.string().allow(""),
        textColor: Joi.string().allow(""),

    }),
};

const create_club_event_validation = {
    body: Joi.object({
        header: Joi.string()
            .trim()
            .min(2)
            .max(50)
            .required(),

        image: Joi.string()
            .uri()
            .optional()
            .allow(""),

        date: Joi.date()
            .required(),

        about: Joi.string()
            .trim()
            .optional()
            .allow(""),

        address: Joi.string()
            .trim()
            .optional()
            .allow(""),

        // club event type and club id are forced from authenticated token in service layer
        eventType: Joi.forbidden(),
        eventFor: Joi.forbidden(),

        entryFee: Joi.string().allow(""),
        colorOne: Joi.string().allow(""),
        colorTwo: Joi.string().allow(""),
        textColor: Joi.string().allow(""),
        status: Joi.string()
            .valid("coming_soon", "active", "cancelled", "completed")
            .optional(),
    }),
};

const create_district_event_validation = {
    body: Joi.object({
        header: Joi.string()
            .trim()
            .min(2)
            .max(50)
            .required(),

        image: Joi.string()
            .uri()
            .optional()
            .allow(""),

        date: Joi.date()
            .required(),

        about: Joi.string()
            .trim()
            .optional()
            .allow(""),

        address: Joi.string()
            .trim()
            .optional()
            .allow(""),

        // club event type and club id are forced from authenticated token in service layer
        eventType: Joi.forbidden(),
        eventFor: Joi.forbidden(),

        entryFee: Joi.string().allow(""),
        colorOne: Joi.string().allow(""),
        colorTwo: Joi.string().allow(""),
        textColor: Joi.string().allow(""),
        status: Joi.string()
            .valid("coming_soon", "active", "cancelled", "completed")
            .optional(),
    }),
};

const create_state_event_validation = {
    body: Joi.object({
        header: Joi.string()
            .trim()
            .min(2)
            .max(50)
            .required(),

        image: Joi.string()
            .uri()
            .optional()
            .allow(""),

        date: Joi.date()
            .required(),

        about: Joi.string()
            .trim()
            .optional()
            .allow(""),

        address: Joi.string()
            .trim()
            .optional()
            .allow(""),

        // club event type and club id are forced from authenticated token in service layer
        eventType: Joi.forbidden(),
        eventFor: Joi.forbidden(),

        /** Required when the authenticated user is Admin; ignored for State users (controller). */
        stateId: objectIdString.optional(),

        entryFee: Joi.string().allow(""),
        colorOne: Joi.string().allow(""),
        colorTwo: Joi.string().allow(""),
        textColor: Joi.string().allow(""),
        status: Joi.string()
            .valid("coming_soon", "active", "cancelled", "completed")
            .optional(),
    }),
};


const update_event_validation = {
    body: Joi.object({
        header: Joi.string()
            .trim()
            .min(2)
            .max(50),

        image: Joi.string()
            .uri()
            .allow(""),

        date: Joi.date(),

        about: Joi.string()
            .trim()
            .allow(""),

        address: Joi.string()
            .trim()
            .allow(""),

        eventType: Joi.string()
            .valid("State", "District", "Club"),

        eventFor: Joi.string()
            .pattern(/^[0-9a-fA-F]{24}$/),

        status: Joi.string()
            .valid("coming_soon", "active", "cancelled", "completed"),
        entryFee: Joi.string().allow(""),
        colorOne: Joi.string().allow(""),
        colorTwo: Joi.string().allow(""),
        textColor: Joi.string().allow(""),
    })


};

export {
    create_event_validation,
    create_club_event_validation,
    create_district_event_validation,
    create_state_event_validation,
    update_event_validation
}