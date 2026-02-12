import { AppError } from "../util/common/AppError.js";

export const validateMultiple = (schemas) => {
    return (req, res, next) => {
        try {
            let finalSchemas = {};

            if (typeof schemas === "object") {
                finalSchemas = schemas;
            } else {
                throw new AppError("Invalid validation schema", 500);
            }

            // 🔥 Loop through all schema types (body, query, params)
            for (const [property, schema] of Object.entries(finalSchemas)) {

                if (schema && req[property]) {

                    // Skip empty query
                    if (property === "query" && Object.keys(req[property]).length === 0) {
                        continue;
                    }

                    const { error, value } = schema.validate(req[property], {
                        abortEarly: false,
                        stripUnknown: true,
                        allowUnknown: true
                    });

                    if (error) {
                        const errorMessage = error.details
                            .map((detail) => detail.message.replace(/"/g, ""))
                            .join(", ");

                        return res.status(400).json({
                            success: false,
                            message: errorMessage
                        });
                    }

                    req[property] = value;
                }
            }

            next();

        } catch (err) {
            next(err);
        }
    };
};
