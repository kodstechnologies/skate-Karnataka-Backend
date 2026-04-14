import Joi from "joi";

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
    })
        .min(1) // ✅ at least one field required
};

export {
    create_event_validation,
    update_event_validation
}