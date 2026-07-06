import Joi from "joi";
import { AGE_GROUPS } from "./SkatingEventCategory.model.js";
import { CATEGORY_STATUS } from "./skatingEventCategory.policy.js";
import { EVENT_CATEGORY_FORMAT } from "./skatingEventCategory.sync.js";
import { parseCompetitionTimeTakenToSeconds } from "../../util/time/timeUtil.js";

const parseClockToMinutes = (rawValue) => {
    const raw = String(rawValue || "").trim();
    const match = raw.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
    if (!match) return null;

    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes < 0 || minutes > 59) {
        return null;
    }

    const meridian = (match[3] || "").toUpperCase();
    if (meridian) {
        if (hours < 1 || hours > 12) return null;
        if (meridian === "PM" && hours < 12) hours += 12;
        if (meridian === "AM" && hours === 12) hours = 0;
    } else if (hours < 0 || hours > 23) {
        return null;
    }

    return hours * 60 + minutes;
};

const startOfDayMs = (raw) => {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return NaN;
    d.setHours(0, 0, 0, 0);
    return d.getTime();
};

/** registerStartDate ≤ registerEndDate ≤ eventStartDate ≤ eventEndDate; same-day event: startTime ≤ endTime */
const enforceEventDateTimeOrder = (value, helpers) => {
    const registerStartMs = startOfDayMs(value.registerStartDate);
    const registerEndMs = startOfDayMs(value.registerEndDate);
    const eventStartMs = startOfDayMs(value.eventStartDate);
    const eventEndMs = startOfDayMs(value.eventEndDate);

    if (
        Number.isNaN(registerStartMs) ||
        Number.isNaN(registerEndMs) ||
        Number.isNaN(eventStartMs) ||
        Number.isNaN(eventEndMs)
    ) {
        return helpers.error("any.custom", { message: "Invalid event date values" });
    }

    if (registerStartMs > registerEndMs) {
        return helpers.error("any.custom", {
            message:
                "registerStartDate must be on or before registerEndDate",
        });
    }
    if (registerEndMs > eventStartMs) {
        return helpers.error("any.custom", {
            message: "registerEndDate must be on or before eventStartDate",
        });
    }
    if (eventStartMs > eventEndMs) {
        return helpers.error("any.custom", {
            message: "eventStartDate must be on or before eventEndDate",
        });
    }

    const startMinutes = parseClockToMinutes(value.eventStartTime);
    const endMinutes = parseClockToMinutes(value.eventEndTime);
    if (startMinutes == null || endMinutes == null) {
        return helpers.error("any.custom", {
            message:
                "eventStartTime and eventEndTime must be valid time format (HH:mm or hh:mm AM/PM)",
        });
    }

    if (eventStartMs === eventEndMs && startMinutes > endMinutes) {
        return helpers.error("any.custom", {
            message:
                "eventStartTime must be on or before eventEndTime when the event starts and ends on the same day",
        });
    }

    return value;
};

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

/** Web dashboard event lists — all events by type (Admin / State). */
export const webEventListQueryValidation = {
    query: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
        search: Joi.string().trim().max(200).allow("").optional(),
        stateId: objectIdString.optional(),
        clubId: objectIdString.optional(),
        districtId: objectIdString.optional(),
    }),
};

/** Club portal — paginated list of all club-owned events. */
export const clubPortalEventListQueryValidation = {
    query: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
        search: Joi.string().trim().max(200).allow("").optional(),
        status: Joi.string()
            .trim()
            .lowercase()
            .valid("coming_soon", "active", "completed", "cancelled")
            .allow("")
            .optional(),
        adminApprovalStatus: Joi.string()
            .trim()
            .lowercase()
            .valid("pending", "approved", "rejected")
            .allow("")
            .optional(),
    }),
};

/** District portal — paginated list of all district-owned events. */
export const districtPortalEventListQueryValidation = {
    query: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
        search: Joi.string().trim().max(200).allow("").optional(),
        status: Joi.string()
            .trim()
            .lowercase()
            .valid("coming_soon", "active", "completed", "cancelled")
            .allow("")
            .optional(),
        adminApprovalStatus: Joi.string()
            .trim()
            .lowercase()
            .valid("pending", "approved", "rejected")
            .allow("")
            .optional(),
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

export const eventCertificateParamsValidation = {
    params: Joi.object({
        id: objectIdString.required().messages({
            "string.pattern.base": "id must be a valid event id",
        }),
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

const categoryFormatField = Joi.string()
    .valid(EVENT_CATEGORY_FORMAT.STANDARD, EVENT_CATEGORY_FORMAT.CUSTOM)
    .default(EVENT_CATEGORY_FORMAT.STANDARD);

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

        categoryFormat: categoryFormatField,
        categorySource: categoryFormatField.optional(),

        skatingEventCategories: skatingEventCategoriesRequired,
    })
        .custom(enforceEventDateTimeOrder)
        .messages({
            "any.custom": "{{#message}}",
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

        categoryFormat: categoryFormatField,
        categorySource: categoryFormatField.optional(),

        skatingEventCategories: skatingEventCategoriesRequired,
    })
        .custom(enforceEventDateTimeOrder)
        .messages({
            "any.custom": "{{#message}}",
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
    })
        .custom(enforceEventDateTimeOrder)
        .messages({
            "any.custom": "{{#message}}",
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

        categoryFormat: categoryFormatField.optional(),
        categorySource: categoryFormatField.optional(),
        skatingEventCategories: skatingEventCategoryIds,
    })


};

const formulaIdField = Joi.string()
    .trim()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .allow(null, "")
    .optional();

const categorySchema = Joi.object({
    name: Joi.string().trim().min(1).required(),
    description: Joi.string().trim().allow("").optional(),
    formula: formulaIdField,
});

const ageGroupSchema = Joi.object({
    label: Joi.string().trim().required(),
    categories: Joi.array().items(categorySchema).default([]),
});

const customCategoryNameItem = Joi.alternatives().try(
    Joi.string().trim().min(1),
    Joi.object({
        name: Joi.string().trim().min(1).required(),
        formula: formulaIdField,
    })
);

const create_event_category_validation = {
    body: Joi.object({
        typeName: Joi.string().trim().min(2).max(100).required(),
        ageGroups: Joi.array().items(ageGroupSchema).default([]),
        customCategoryNames: Joi.array().items(customCategoryNameItem).default([]),
        names: Joi.array().items(Joi.string().trim().min(1)).optional(),
        categoryStatus: Joi.string()
            .valid(CATEGORY_STATUS.STANDARD, CATEGORY_STATUS.CUSTOM)
            .optional(),
        clubId: Joi.string().trim().pattern(/^[0-9a-fA-F]{24}$/).optional(),
        districtId: Joi.string().trim().pattern(/^[0-9a-fA-F]{24}$/).optional(),
    }),
};

const update_event_category_validation = {
    body: Joi.object({
        typeName: Joi.string().trim().min(2).max(100),
        ageGroups: Joi.array().items(ageGroupSchema),
        customCategoryNames: Joi.array().items(customCategoryNameItem).optional(),
        names: Joi.array().items(Joi.string().trim().min(1)).optional(),
    }).min(1),
};

const upsert_org_custom_category_validation = {
    body: Joi.object({
        typeName: Joi.string().trim().min(2).max(100).optional(),
        customCategoryNames: Joi.array().items(customCategoryNameItem).default([]),
        names: Joi.array().items(Joi.string().trim().min(1)).optional(),
    }),
};

const eventCategoryListQueryValidation = {
    query: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
        categoryStatus: Joi.string()
            .valid(CATEGORY_STATUS.STANDARD, CATEGORY_STATUS.CUSTOM)
            .optional(),
        ownerType: Joi.string().valid("club", "district").optional(),
        clubId: Joi.string().trim().pattern(/^[0-9a-fA-F]{24}$/).optional(),
        districtId: Joi.string().trim().pattern(/^[0-9a-fA-F]{24}$/).optional(),
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

const FORMULA_ROUND_NAMES = [
    "1stRound",
    "2ndRound",
    "quarterFinal",
    "semiFinal",
    "final",
];

/** Maps legacy / alternate round labels to canonical names (matches competition rounds). */
const normalizeFormulaRoundName = (value) => {
    const raw = String(value ?? "").trim();
    if (!raw) return null;
    if (FORMULA_ROUND_NAMES.includes(raw)) return raw;

    const aliases = {
        "1stround": "1stRound",
        "2ndround": "2ndRound",
        quarterfinal: "quarterFinal",
        semifinal: "semiFinal",
        QuarterFinal: "quarterFinal",
        SemiFinal: "semiFinal",
        Final: "final",
    };

    return aliases[raw] ?? aliases[raw.toLowerCase()] ?? null;
};

const formulaRoundItem = Joi.object({
    roundName: Joi.string()
        .trim()
        .required()
        .custom((value, helpers) => {
            const normalized = normalizeFormulaRoundName(value);
            if (!normalized) {
                return helpers.error("any.invalid");
            }
            return normalized;
        })
        .messages({
            "any.invalid": `roundName must be one of: ${FORMULA_ROUND_NAMES.join(", ")}`,
        }),
    qualificationType: Joi.string()
        .trim()
        .valid("TIME", "POSITION")
        .required(),
    minParticipants: Joi.number().integer().optional(),
    maxParticipants: Joi.number().integer().optional(),
    qualifyCount: Joi.number().integer().optional(),
    qualifyCountLessThan65: Joi.number().integer().optional(),
    qualifyCountMoreThan65: Joi.number().integer().optional(),
    groupSize: Joi.number().integer().optional(),
    qualifyPerGroup: Joi.number().integer().min(0).max(3).optional(),
});

const create_formula_validation = {
    body: Joi.object({
        formulaName: Joi.string().trim().min(1).max(200).required(),
        categoryName: Joi.string().trim().max(200).allow("").optional(),
        ageGroup: Joi.string().trim().allow("").optional(),
        rounds: Joi.array().items(formulaRoundItem).default([]),
        finalSelectionCount: Joi.number().integer().min(1).default(3),
    }),
};

const update_formula_validation = {
    body: Joi.object({
        formulaName: Joi.string().trim().min(1).max(200),
        categoryName: Joi.string().trim().max(200).allow(""),
        ageGroup: Joi.string().trim().allow(""),
        rounds: Joi.array().items(formulaRoundItem),
        finalSelectionCount: Joi.number().integer().min(1),
    }).min(1),
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
    upsert_org_custom_category_validation,
    eventCategoryListQueryValidation,
    register_form_validation,
    create_formula_validation,
    update_formula_validation,
    // stateEventResultQueryValidation
};