const toTrimmedString = (value) => {
    if (value === undefined || value === null) return "";
    return String(value).trim();
};

const boolToStoredString = (value) => {
    if (value === undefined || value === null || value === "") return value;
    if (typeof value === "boolean") return value ? "yes" : "no";
    const normalized = toTrimmedString(value).toLowerCase();
    if (normalized === "true") return "yes";
    if (normalized === "false") return "no";
    return toTrimmedString(value);
};

/** Flutter multipart field names / booleans before validation and DB save. */
export const normalizeOfficialFormPayload = (body = {}) => {
    const data = { ...body };

    if (data.coaching !== undefined) {
        data.coaching = boolToStoredString(data.coaching);
    }
    if (data.officiating !== undefined) {
        data.officiating = boolToStoredString(data.officiating);
    }

    [
        "technicalTrainingCourse",
        "coachingExperience",
        "isSkater",
        "isOfficiating",
        "conductingClasses",
    ].forEach((key) => {
        if (data[key] !== undefined && data[key] !== null && toTrimmedString(data[key]) !== "") {
            data[key] = toTrimmedString(data[key]).toLowerCase();
        }
    });

    if (data.officialEmail) {
        data.officialEmail = toTrimmedString(data.officialEmail).toLowerCase();
    }

    delete data.documentFile;
    delete data.documentFileName;
    delete data.profileImageFile;
    delete data.profileImageName;

    return data;
};

export const isOfficialFormPayload = (body = {}) =>
    body.experience !== undefined ||
    body.technicalTrainingCourse !== undefined ||
    body.coachingExperience !== undefined ||
    body.officialEmail !== undefined ||
    body.officialContactNumber !== undefined ||
    body.isSkater !== undefined ||
    body.isOfficiating !== undefined;
