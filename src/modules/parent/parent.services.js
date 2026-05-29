import mongoose from "mongoose";
import { AppError } from "../../util/common/AppError.js";
import { Skater } from "../skater/skater.model.js";
import {
    afterLoginParentFormRepositories,
    appendSkatersToParentRepositories,
    displayAllParentRepositories,
    displayParentFullDetailsRepositories,
    findParentByIdRepositories,
    findUserByPhoneOrEmailRepositories
} from "./parent.repositories.js";

const SKATER_KEY_REGEX = /^skaters\[(\d*)\]\[([^\]]+)\]$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;
const AADHAR_REGEX = /^\d{12}$/;
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const ALLOWED_GENDERS = new Set(["male", "female", "other"]);
const ALLOWED_BLOOD_GROUPS = new Set(["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]);

const toTrimmedString = (value) => (value == null ? "" : String(value).trim());
const normalizeEmail = (value) => toTrimmedString(value).toLowerCase();
const DOB_DMY_REGEX = /^(\d{2})[-/](\d{2})[-/](\d{4})$/;

const parseDobFromDmy = (rawDob, index) => {
    const raw = toTrimmedString(rawDob);
    if (!raw) {
        return undefined;
    }

    const match = raw.match(DOB_DMY_REGEX);
    if (!match) {
        throw new AppError(
            `Skater ${index + 1}: dob must be in DD-MM-YYYY format`,
            400
        );
    }

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    const parsed = new Date(year, month - 1, day);
    const isValid =
        !Number.isNaN(parsed.getTime()) &&
        parsed.getFullYear() === year &&
        parsed.getMonth() === month - 1 &&
        parsed.getDate() === day;

    if (!isValid) {
        throw new AppError(`Skater ${index + 1}: invalid dob`, 400);
    }

    return parsed;
};

const formatDateAsDmy = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
};

const splitEmailParts = (email = "") => {
    const atIndex = email.indexOf("@");
    if (atIndex <= 0 || atIndex === email.length - 1) {
        return null;
    }
    return {
        localPart: email.slice(0, atIndex),
        domainPart: email.slice(atIndex + 1),
    };
};

const normalizeSkaterDocuments = (documentsValue) => {
    if (!documentsValue) return [];
    const docs = Array.isArray(documentsValue) ? documentsValue : [documentsValue];

    return docs
        .map((doc) => {
            if (typeof doc === "string") {
                const trimmedUrl = doc.trim();
                if (!trimmedUrl) return null;
                return {
                    url: trimmedUrl,
                    name: "document",
                    uploadedAt: new Date(),
                };
            }

            if (doc && typeof doc === "object" && doc.url) {
                const trimmedUrl = String(doc.url).trim();
                if (!trimmedUrl) return null;
                return {
                    url: trimmedUrl,
                    name: String(doc.name || "document").trim(),
                    uploadedAt: doc.uploadedAt ? new Date(doc.uploadedAt) : new Date(),
                };
            }

            return null;
        })
        .filter(Boolean);
};

const parseSkatersFromBody = (body = {}) => {
    const mapped = new Map();

    const bodySkaters = Array.isArray(body?.skaters) ? body.skaters : [];
    for (let index = 0; index < bodySkaters.length; index += 1) {
        const payload = bodySkaters[index];
        if (payload && typeof payload === "object") {
            mapped.set(index, { ...payload });
        }
    }

    let fallbackIndex = mapped.size;
    for (const [key, value] of Object.entries(body)) {
        const match = key.match(SKATER_KEY_REGEX);
        if (!match) continue;

        const index = match[1] === "" ? fallbackIndex++ : Number(match[1]);
        const field = match[2];
        if (!mapped.has(index)) {
            mapped.set(index, {});
        }
        mapped.get(index)[field] = value;
    }

    return [...mapped.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, value]) => value);
};

const validateSkaterPayload = (payload, index) => {
    const fullName = toTrimmedString(payload.fullName);
    const phone = toTrimmedString(payload.phone);
    const email = normalizeEmail(payload.email);
    const gender = toTrimmedString(payload.gender).toLowerCase();
    const dobRaw = toTrimmedString(payload.dob);
    const bloodGroup = toTrimmedString(payload.bloodGroup).toUpperCase();
    const aadharNumber = toTrimmedString(payload.aadharNumber);

    if (!fullName || fullName.length < 2) {
        throw new AppError(`Skater ${index + 1}: fullName is required (min 2 chars)`, 400);
    }
    if (phone && !PHONE_REGEX.test(phone)) {
        throw new AppError(`Skater ${index + 1}: phone must be a valid 10-digit Indian number`, 400);
    }
    if (email && !EMAIL_REGEX.test(email)) {
        throw new AppError(`Skater ${index + 1}: invalid email format`, 400);
    }
    if (gender && !ALLOWED_GENDERS.has(gender)) {
        throw new AppError(`Skater ${index + 1}: gender must be male, female, or other`, 400);
    }

    const dob = parseDobFromDmy(dobRaw, index);

    if (aadharNumber && !AADHAR_REGEX.test(aadharNumber)) {
        throw new AppError(`Skater ${index + 1}: aadharNumber must be 12 digits`, 400);
    }
    if (bloodGroup && !ALLOWED_BLOOD_GROUPS.has(bloodGroup)) {
        throw new AppError(`Skater ${index + 1}: invalid bloodGroup`, 400);
    }

    const objectIdFields = ["category", "discipline", "district", "club"];
    for (const field of objectIdFields) {
        const value = toTrimmedString(payload[field]);
        if (!value) continue;
        if (!mongoose.Types.ObjectId.isValid(value)) {
            throw new AppError(`Skater ${index + 1}: invalid ${field} id`, 400);
        }
    }

    return {
        fullName,
        phone,
        email,
        gender,
        // Accept both rsfiId and common typo rfsiId from multipart clients.
        rsfiId: toTrimmedString(payload.rsfiId || payload.rfsiId) || undefined,
        dob: dob || undefined,
        bloodGroup: bloodGroup || undefined,
        school: toTrimmedString(payload.school) || undefined,
        grade: toTrimmedString(payload.grade) || undefined,
        aadharNumber: aadharNumber || undefined,
        category: toTrimmedString(payload.category) || undefined,
        discipline: toTrimmedString(payload.discipline) || undefined,
        district: toTrimmedString(payload.district) || undefined,
        club: toTrimmedString(payload.club) || undefined,
        signature: toTrimmedString(payload.signature) || undefined,
        photo: toTrimmedString(payload.photo) || undefined,
        documents: normalizeSkaterDocuments(payload.documents),
    };
};

const getUniqueEmailForSkater = async ({
    preferredEmail,
    skaterFullName,
    parentId,
    batchUsedEmails,
}) => {
    const normalizedPreferredEmail = normalizeEmail(preferredEmail);
    if (normalizedPreferredEmail) {
        if (batchUsedEmails.has(normalizedPreferredEmail)) {
            throw new AppError("Skater email already exists", 409);
        }
        const existingPreferredEmailUser = await findUserByPhoneOrEmailRepositories({
            email: normalizedPreferredEmail,
        });
        if (existingPreferredEmailUser) {
            throw new AppError("Skater email already exists", 409);
        }
        batchUsedEmails.add(normalizedPreferredEmail);
        return normalizedPreferredEmail;
    }

    let baseEmail = normalizedPreferredEmail;
    if (!baseEmail) {
        const safeName = (skaterFullName || "skater")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "")
            .slice(0, 12) || "skater";
        baseEmail = `${safeName}.${String(parentId).slice(-6)}@krsa.local`;
    }

    const parsed = splitEmailParts(baseEmail);
    if (!parsed) {
        throw new AppError("Invalid skater email format", 400);
    }

    const { localPart, domainPart } = parsed;
    let attempt = 0;

    while (attempt < 2000) {
        const candidate = attempt === 0
            ? `${localPart}@${domainPart}`
            : `${localPart}+${attempt}@${domainPart}`;
        const inBatch = batchUsedEmails.has(candidate);
        if (!inBatch) {
            const existing = await findUserByPhoneOrEmailRepositories({ email: candidate });
            if (!existing) {
                batchUsedEmails.add(candidate);
                return candidate;
            }
        }
        attempt += 1;
    }

    throw new AppError("Unable to generate unique skater email", 500);
};

const getUniquePhoneForSkater = async ({
    preferredPhone,
    parentPhone,
    batchUsedPhones,
    index,
}) => {
    const normalizedSkaterPhone = toTrimmedString(preferredPhone);
    const normalizedParentPhone = toTrimmedString(parentPhone);

    if (!normalizedSkaterPhone) {
        throw new AppError(`Skater ${index + 1}: phone is required`, 400);
    }

    if (!PHONE_REGEX.test(normalizedSkaterPhone)) {
        throw new AppError(
            `Skater ${index + 1}: phone must be a valid 10-digit Indian number`,
            400
        );
    }

    if (normalizedParentPhone && normalizedSkaterPhone === normalizedParentPhone) {
        throw new AppError(`Skater ${index + 1}: phone cannot be the same as parent phone`, 400);
    }

    if (batchUsedPhones.has(normalizedSkaterPhone)) {
        throw new AppError(`Skater ${index + 1}: phone already used in this request`, 409);
    }

    const existingPhoneUser = await findUserByPhoneOrEmailRepositories({
        phone: normalizedSkaterPhone,
    });
    if (existingPhoneUser) {
        throw new AppError(`Skater ${index + 1}: phone already used`, 409);
    }

    batchUsedPhones.add(normalizedSkaterPhone);
    return normalizedSkaterPhone;
};


const createSkatersForParent = async (skatersInput = [], parentContext = {}) => {
    const createdSkaters = [];
    const createdSkaterIds = [];
    const batchUsedEmails = new Set();
    const batchUsedPhones = new Set();

    for (let index = 0; index < skatersInput.length; index += 1) {
        const validated = validateSkaterPayload(skatersInput[index], index);
        const skaterPhone = await getUniquePhoneForSkater({
            preferredPhone: validated.phone,
            parentPhone: parentContext.phone,
            batchUsedPhones,
            index,
        });
        const skaterEmail = await getUniqueEmailForSkater({
            preferredEmail: validated.email,
            skaterFullName: validated.fullName,
            parentId: parentContext.id,
            batchUsedEmails,
        });

        try {
            const created = await Skater.create({
                role: "Skater",
                verify: true,
                fullName: validated.fullName,
                phone: skaterPhone,
                email: skaterEmail,
                rsfiId: validated.rsfiId,
                gender: validated.gender || undefined,
                dob: validated.dob,
                bloodGroup: validated.bloodGroup,
                school: validated.school,
                grade: validated.grade,
                aadharNumber: validated.aadharNumber,
                category: validated.category,
                discipline: validated.discipline,
                district: validated.district,
                club: validated.club,
                clubStatus: validated.club ? "join" : "apply",
                parent: parentContext.fullName || "",
                SkaterParent: parentContext.id,
                signature: validated.signature,
                photo: validated.photo,
                documents: validated.documents,
            });

            createdSkaterIds.push(created._id);
            createdSkaters.push({
                skaterId: String(created._id),
                skaterName: created.fullName || "",
                dob: formatDateAsDmy(created.dob),
                rsfiId: created.rsfiId || "",
                signature: created.signature || "",
                verify: Boolean(created.verify),
            });
        } catch (error) {
            if (error?.code === 11000) {
                if (Object.prototype.hasOwnProperty.call(error?.keyPattern || {}, "phone")) {
                    throw new AppError(`Skater ${index + 1}: phone already used`, 409);
                }
                if (Object.prototype.hasOwnProperty.call(error?.keyPattern || {}, "email")) {
                    throw new AppError(`Skater ${index + 1}: email already exists`, 409);
                }
            }
            throw error;
        }
    }

    return { createdSkaters, createdSkaterIds };
};

const afterLoginFormParentService = async (data, id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError("Invalid parent id", 400);
    }

    const existingParent = await findParentByIdRepositories(id);
    if (!existingParent) {
        throw new AppError("Parent not found", 404);
    }

    if (data?.phone || data?.email) {
        const duplicateUser = await findUserByPhoneOrEmailRepositories({
            phone: data.phone,
            email: data.email,
            excludeId: id,
        });

        if (duplicateUser) {
            const isPhoneConflict = Boolean(data?.phone) && String(duplicateUser?.phone || "") === String(data.phone || "");
            const isEmailConflict =
                Boolean(data?.email) &&
                String(duplicateUser?.email || "").toLowerCase() === String(data.email || "").toLowerCase();

            if (isPhoneConflict && isEmailConflict) {
                throw new AppError("Phone number and email already used", 409);
            }
            if (isPhoneConflict) {
                throw new AppError("Phone number already used", 409);
            }
            if (isEmailConflict) {
                throw new AppError("Email already exists", 409);
            }
        }
    }

    const updatedParent = await afterLoginParentFormRepositories(data, id);
    if (!updatedParent) {
        throw new AppError("Parent not found", 404);
    }

    const skatersInput = parseSkatersFromBody(data);
    const { createdSkaters, createdSkaterIds } = await createSkatersForParent(skatersInput, {
        id,
        fullName: updatedParent.fullName || existingParent.fullName,
        phone: updatedParent.phone || existingParent.phone,
    });

    if (createdSkaterIds.length !== skatersInput.length) {
        throw new AppError("Failed to create all skaters", 500);
    }

    const parentWithSkaters = await appendSkatersToParentRepositories(id);
    if (!parentWithSkaters) {
        throw new AppError("Parent not found", 404);
    }

    return {
        parentId: String(parentWithSkaters._id),
        parentName: parentWithSkaters.fullName || "",
        parentAccount: {
            userId: String(parentWithSkaters._id),
            fullName: parentWithSkaters.fullName || "",
            role: String(parentWithSkaters.role || "Parent").toLowerCase(),
        },
        createdSkaters,
        skaters: (parentWithSkaters.skaters || []).map((skater) => ({
            skaterId: String(skater._id),
            skaterName: skater.fullName || "",
            dob: formatDateAsDmy(skater.dob),
            phone: skater.phone || "",
            email: skater.email || "",
            rsfiId: skater.rsfiId || "",
            signature: skater.signature || "",
            verify: Boolean(skater.verify),
        })),
    };

}

const displayAllParentService = async (query) => {
    const {
        page = 1,
        limit = 10,
        search = "",
        fullName = "",
        phone = "",
        gender = "",
        email = "",
    } = query;
    return await displayAllParentRepositories({ page, limit, search, fullName, phone, gender, email });
}

const displayParentFullDetailsService = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError("Invalid parent id", 400);
    }
    const parent = await displayParentFullDetailsRepositories(id);
    if (!parent) {
        throw new AppError("Parent not found", 404);
    }
    return parent;
}



export {
    afterLoginFormParentService,
    displayAllParentService,
    displayParentFullDetailsService,
}