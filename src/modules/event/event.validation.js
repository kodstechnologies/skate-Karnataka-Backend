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
        search: Joi.string().trim().max(200).allow("").optional(),
    }),
};

export const stateEventSkatersListQueryValidation = {
    query: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
        search: Joi.string().trim().max(200).allow("").optional(),
        ageGroup: Joi.string().trim().allow("").optional(),
        categoryName: Joi.string().trim().allow("").optional(),
    }),
};

const state_skater_time_update_validation = {
    body: Joi.object({
        eventId: objectIdString.required(),
        skaterId: objectIdString.optional(),
        registrationId: objectIdString.optional(),
        status: Joi.string()
            .trim()
            .lowercase()
            .valid("pending", "attend", "absent", "apsent")
            .optional(),
        isDisqualified: Joi.boolean().optional(),
        categories: Joi.array().items(
            Joi.object({
                name: Joi.string().trim().min(1).required(),
                timeTaken: Joi.number().allow(null).optional(),
                rank: Joi.number().integer().allow(null).optional(),
                isDisqualified: Joi.boolean().optional(),
                remarks: Joi.string().trim().allow("").optional(),
                attendanceStatus: Joi.string()
                    .trim()
                    .lowercase()
                    .valid("pending", "attend", "absent", "apsent")
                    .optional(),
            })
        ).optional(),
        skaters: Joi.array().items(
            Joi.object({
                skaterId: objectIdString.optional(),
                registrationId: objectIdString.optional(),
                status: Joi.string()
                    .trim()
                    .lowercase()
                    .valid("pending", "attend", "absent", "apsent")
                    .optional(),
                isDisqualified: Joi.boolean().optional(),
                categories: Joi.array().items(
                    Joi.object({
                        name: Joi.string().trim().min(1).required(),
                        timeTaken: Joi.number().allow(null).optional(),
                        rank: Joi.number().integer().allow(null).optional(),
                        isDisqualified: Joi.boolean().optional(),
                        remarks: Joi.string().trim().allow("").optional(),
                        attendanceStatus: Joi.string()
                            .trim()
                            .lowercase()
                            .valid("pending", "attend", "absent", "apsent")
                            .optional(),
                    })
                ).optional(),
            })
                .xor("skaterId", "registrationId")
                .min(2)
        ).min(1).optional(),
    })
        .xor("skaterId", "registrationId", "skaters")
        .custom((value, helpers) => {
            if (
                (value.skaterId || value.registrationId) &&
                value.status === undefined &&
                value.isDisqualified === undefined &&
                value.categories === undefined
            ) {
                return helpers.error("any.custom", {
                    message: "Single skater update requires status, isDisqualified, or categories",
                });
            }
            return value;
        })
        .messages({
            "object.xor": "Provide either skaterId/registrationId (single) or skaters (batch), not both",
            "any.custom": "{{#message}}",
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

        registerStartDate: Joi.date().required(),
        registerEndDate: Joi.date().required(),
        eventStartDate: Joi.date().required(),
        eventEndDate: Joi.date().required(),
        eventStartTime: Joi.string().trim().required(),
        eventEndTime: Joi.string().trim().required(),

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

        registerStartDate: Joi.date().required(),
        registerEndDate: Joi.date().required(),
        eventStartDate: Joi.date().required(),
        eventEndDate: Joi.date().required(),
        eventStartTime: Joi.string().trim().required(),
        eventEndTime: Joi.string().trim().required(),

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

        registerStartDate: Joi.date().required(),
        registerEndDate: Joi.date().required(),
        eventStartDate: Joi.date().required(),
        eventEndDate: Joi.date().required(),
        eventStartTime: Joi.string().trim().required(),
        eventEndTime: Joi.string().trim().required(),

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

        registerStartDate: Joi.date().required(),
        registerEndDate: Joi.date().required(),
        eventStartDate: Joi.date().required(),
        eventEndDate: Joi.date().required(),
        eventStartTime: Joi.string().trim().required(),
        eventEndTime: Joi.string().trim().required(),

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

        registerStartDate: Joi.date(),
        registerEndDate: Joi.date(),
        eventStartDate: Joi.date(),
        eventEndDate: Joi.date(),
        eventStartTime: Joi.string().trim(),
        eventEndTime: Joi.string().trim(),

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

const categorySchema = Joi.object({
    name: Joi.string().trim().min(1).required(),
});

const ageGroupSchema = Joi.object({
    label: Joi.string().trim().required(),
    categories: Joi.array().items(categorySchema).default([]),
});

const create_event_category_validation = {
    body: Joi.object({
        typeName: Joi.string().trim().min(2).max(100).required(),
        ageGroups: Joi.array().items(ageGroupSchema).default([]),
    }),
};

const update_event_category_validation = {
    body: Joi.object({
        typeName: Joi.string().trim().min(2).max(100),
        ageGroups: Joi.array().items(ageGroupSchema),
    }).min(1),
};

const eventCategoryListQueryValidation = {
    query: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
    }),
};

const register_form_validation = {
    body: Joi.object({
        eventId: Joi.string().trim().pattern(/^[0-9a-fA-F]{24}$/).required(),
        name: Joi.string().trim().min(1).required(),
        ageGroup: Joi.string().trim().required(),
        categories: Joi.array().items(
            Joi.object({
                name: Joi.string().trim().min(1).required(),
                timeTaken: Joi.number().allow(null),
                rank: Joi.number().integer().allow(null),
                isDisqualified: Joi.boolean().optional(),
                remarks: Joi.string().trim().allow("").optional(),
            })
        ).min(1).required(),
        paymentStatus: Joi.string().valid("pending", "paid", "failed").optional(),
    }),
};

export {
    state_skater_time_update_validation,
    create_event_validation,
    create_club_event_validation,
    create_district_event_validation,
    create_state_event_validation,
    update_event_validation,
    create_event_category_validation,
    update_event_category_validation,
    eventCategoryListQueryValidation,
    register_form_validation
};