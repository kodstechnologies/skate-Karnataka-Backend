import Joi from "joi";
import { AGE_GROUPS } from "./SkatingEventCategory.model.js";
import { parseCompetitionTimeTakenToSeconds } from "../../util/time/timeUtil.js";

const objectIdString = Joi.string()
    .trim()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
        "string.pattern.base": "stateId must be a valid 24-character hex id",
    });

/** For multipart bodies: field may be a JSON string or an array of SkatingEventCategory ids. */
const skatingEventCategoryIds = Joi.any()
    .optional()
    .custom((value, helpers) => {
        if (value === undefined || value === null || value === "") {
            return undefined;
        }
        let arr = value;
        if (typeof value === "string") {
            const trimmed = value.trim();
            if (!trimmed) return undefined;
            try {
                arr = JSON.parse(trimmed);
            } catch {
                return helpers.error("any.invalid", {
                    message: "skatingEventCategories must be valid JSON when sent as a string",
                });
            }
        }
        if (!Array.isArray(arr)) {
            return helpers.error("any.invalid", {
                message: "skatingEventCategories must be an array of SkatingEventCategory ids",
            });
        }
        const { error, value: normalized } = Joi.array()
            .items(objectIdString)
            .validate(arr, { abortEarly: false });
        if (error) {
            return helpers.error("any.invalid", {
                message: error.details.map((d) => d.message.replace(/"/g, "")).join(", "),
            });
        }
        return normalized;
    }, "SkatingEventCategory id array");

/** Joi.array().items(objectIdString.required()).min(1).required() — plus JSON string for multipart/form-data. */
const skatingEventCategoriesRequired = Joi.any()
    .required()
    .custom((value, helpers) => {
        if (value === undefined || value === null || value === "") {
            return helpers.error("any.required");
        }
        let arr = value;
        if (typeof value === "string") {
            const trimmed = value.trim();
            if (!trimmed) return helpers.error("any.required");
            try {
                arr = JSON.parse(trimmed);
            } catch {
                return helpers.error("any.invalid", {
                    message: "skatingEventCategories must be valid JSON when sent as a string",
                });
            }
        }
        if (!Array.isArray(arr)) {
            return helpers.error("any.invalid", {
                message: "skatingEventCategories must be an array of SkatingEventCategory ids",
            });
        }
        const { error, value: normalized } = Joi.array()
            .items(objectIdString.required())
            .min(1)
            .validate(arr, { abortEarly: false });
        if (error) {
            return helpers.error("any.invalid", {
                message: error.details.map((d) => d.message.replace(/"/g, "")).join(", "),
            });
        }
        return normalized;
    }, "required SkatingEventCategory id array");

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

export const stateEventResultQueryValidation = {
    query: Joi.object({
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

export const competitionDetailsParamsValidation = {
    params: Joi.object({
        id: objectIdString.required(),
    }),
};

const competitionAgeGroupLabel = Joi.string()
    .trim()
    .valid(...AGE_GROUPS.map((g) => g.label))
    .messages({
        "any.only": `ageGroup must be one of: ${AGE_GROUPS.map((g) => g.label).join(", ")}`,
    });

export const competitionAllSkaterValidation = {
    body: Joi.object({
        eventId: objectIdString.required(),
        skatingEventCategoryId: objectIdString.required(),
        ageGroup: competitionAgeGroupLabel.required(),
        name: Joi.string().trim().min(1).required(),
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
        search: Joi.string().trim().max(200).allow("").optional(),
    }),
};

const competitionTimeTaken = Joi.alternatives()
    .try(Joi.number(), Joi.string().trim().min(1))
    .custom((value, helpers) => {
        try {
            return parseCompetitionTimeTakenToSeconds(value);
        } catch (err) {
            return helpers.error("any.invalid", {
                message: err.message || "Invalid timeTaken",
            });
        }
    });

const givenPointCategoryItem = Joi.object({
    name: Joi.string().trim().min(1).required(),
    timeTaken: competitionTimeTaken.allow(null).optional(),
    rank: Joi.number().integer().allow(null).optional(),
    isDisqualified: Joi.boolean().optional(),
    remarks: Joi.string().trim().allow("").optional(),
    attendanceStatus: Joi.string()
        .trim()
        .lowercase()
        .valid("pending", "attend", "absent")
        .optional(),
});

const givenPointSkaterItem = Joi.object({
    registrationId: objectIdString.required(),
    skaterId: objectIdString.optional(),
    timeTaken: competitionTimeTaken.optional(),
    rank: Joi.number().integer().allow(null).optional(),
    isDisqualified: Joi.boolean().optional(),
    remarks: Joi.string().trim().allow("").optional(),
}).custom((value, helpers) => {
    const hasUpdateField =
        value.timeTaken !== undefined ||
        value.rank !== undefined ||
        value.isDisqualified !== undefined ||
        value.remarks !== undefined;

    if (!hasUpdateField) {
        return helpers.error("any.custom", {
            message:
                "Each skater must include at least one of timeTaken, rank, isDisqualified, or remarks",
        });
    }

    return value;
});

const given_point_bulk_body = Joi.object({
    eventId: objectIdString.required(),
    skatingEventCategoryId: objectIdString.required(),
    ageGroup: competitionAgeGroupLabel.required(),
    name: Joi.string().trim().min(1).required(),
    skaters: Joi.array().items(givenPointSkaterItem).min(1).required(),
}).custom((value, helpers) => {
    const hasUpdatableSkater = (value.skaters || []).some(
        (skater) =>
            skater.timeTaken !== undefined ||
            skater.rank !== undefined ||
            skater.isDisqualified !== undefined ||
            skater.remarks !== undefined
    );

    if (!hasUpdatableSkater) {
        return helpers.error("any.custom", {
            message: "At least one skater must include a field to update",
        });
    }

    return value;
});

const given_point_single_body = Joi.object({
    eventId: objectIdString.required(),
    skatingEventCategoryId: Joi.forbidden(),
    ageGroup: Joi.forbidden(),
    name: Joi.forbidden(),
    skaters: Joi.forbidden(),
    skaterId: objectIdString.optional(),
    registrationId: objectIdString.optional(),
    categories: Joi.array().items(givenPointCategoryItem).min(1).required(),
})
    .xor("skaterId", "registrationId")
    .custom((value, helpers) => {
        const hasUpdateField = (value.categories || []).some(
            (c) =>
                c.timeTaken !== undefined ||
                c.rank !== undefined ||
                c.isDisqualified !== undefined ||
                c.remarks !== undefined ||
                c.attendanceStatus !== undefined
        );
        if (!hasUpdateField) {
            return helpers.error("any.custom", {
                message:
                    "At least one category must include timeTaken, rank, isDisqualified, remarks, or attendanceStatus",
            });
        }
        return value;
    });

const given_point_validation = {
    body: Joi.alternatives().try(given_point_bulk_body, given_point_single_body),
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

        skatingEventCategories: skatingEventCategoriesRequired,
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

        skatingEventCategories: skatingEventCategoriesRequired,
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

        skatingEventCategories: skatingEventCategoryIds,
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

const registerCategoryItem = Joi.alternatives().try(
    Joi.string().trim().min(1),
    Joi.object({
        name: Joi.string().trim().min(1).required(),
        timeTaken: Joi.number().allow(null),
        rank: Joi.number().integer().allow(null),
        isDisqualified: Joi.boolean().optional(),
        remarks: Joi.string().trim().allow("").optional(),
    })
);

const register_form_validation = {
    body: Joi.object({
        eventId: Joi.string().trim().pattern(/^[0-9a-fA-F]{24}$/).required(),
        name: Joi.string().trim().min(1).optional(),
        ageGroup: Joi.string().trim().required(),
        categoriesId: Joi.string()
            .trim()
            .allow("")
            .optional()
            .custom((value, helpers) => {
                if (!value) return undefined;
                if (!/^[0-9a-fA-F]{24}$/.test(value)) {
                    return helpers.error("any.invalid", {
                        message: "categoriesId must be a valid 24-character hex id",
                    });
                }
                return value;
            }),
        categories: Joi.array().items(registerCategoryItem).min(1).required(),
        paymentStatus: Joi.string().valid("pending", "paid", "failed").optional(),
    }),
};

export const displayApplicationsQueryValidation = {
    query: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
    }),
};

export const approveCertificationParamsValidation = {
    params: Joi.object({
        id: Joi.string()
            .trim()
            .pattern(/^[0-9a-fA-F]{24}$/)
            .required()
            .messages({
                "string.pattern.base":
                    "id must be the EventParticipant _id (24-character hex)",
            }),
    }),
};

export {
    state_skater_time_update_validation,
    given_point_validation,
    create_event_validation,
    create_club_event_validation,
    create_district_event_validation,
    create_state_event_validation,
    update_event_validation,
    create_event_category_validation,
    update_event_category_validation,
    eventCategoryListQueryValidation,
    register_form_validation,
    // stateEventResultQueryValidation
};