import { validate } from "../../middleware/validate.multiple.js";
import { afterLoginClubFormValidation } from "./academy.validation.js";
import { afterLoginOfficialFormValidation } from "../official/official.validation.js";
import { isOfficialFormPayload } from "../official/officialFormPayload.js";

export const validateAcademyOrOfficialForm = (req, res, next) => {
    const schemas = isOfficialFormPayload(req.body)
        ? afterLoginOfficialFormValidation
        : afterLoginClubFormValidation;
    return validate(schemas)(req, res, next);
};
