import { Parent } from "./parent.model.js";
import { BaseAuth } from "../auth/baseAuth.model.js";
import { Skater } from "../skater/skater.model.js";
import { paginate, calcTotalPages } from "../../util/common/paginate.js";

const PARENT_SKATER_SELECT =
    "_id fullName dob phone email verify rsfiId krsaId gender profile photo signature";

const getSkatersForParent = async (parentId) =>
    Skater.find({ SkaterParent: parentId, role: { $regex: /^skater$/i } })
        .select(PARENT_SKATER_SELECT)
        .sort({ createdAt: -1 })
        .lean();

const getParentWithSkaters = async (id) => {
    const parent = await BaseAuth.findOne({ _id: id, role: { $regex: /^parent$/i } })
        .select("_id fullName phone email role")
        .lean();

    if (!parent) return null;

    const skaters = await getSkatersForParent(id);

    return { ...parent, skaters };
};

const afterLoginParentFormRepositories = async (data, id) => {
    return await BaseAuth.findOneAndUpdate(
        { _id: id, role: { $regex: /^parent$/i } },
        {
            $set: {
                ...data,
                verify: true,
            },
        },
        { returnDocument: "after", runValidators: true }
    )
        .select("fullName phone countryCode email gender address profile verify role")
        .lean();
};

const findParentByIdRepositories = async (id) => {
    return getParentWithSkaters(id);
};

const appendSkatersToParentRepositories = async (id) => {
    return getParentWithSkaters(id);
};

const findUserByPhoneOrEmailRepositories = async ({ phone, email, excludeId }) => {
    const orConditions = [];
    if (phone) {
        orConditions.push({ phone });
    }
    if (email) {
        orConditions.push({ email: email.toLowerCase().trim() });
    }
    if (!orConditions.length) return null;

    const query = { $or: orConditions };
    if (excludeId) {
        query._id = { $ne: excludeId };
    }

    return BaseAuth.findOne(query).select("_id phone email role").lean();
};

const displayAllParentRepositories = async ({ page, limit, search, fullName, phone, gender, email }) => {
    const { skip, limit: perPage, page: currentPage } = paginate(page, limit);

    const query = { role: "Parent" };

    if (fullName) {
        query.fullName = new RegExp(fullName.trim(), "i");
    }

    if (phone) {
        query.phone = new RegExp(String(phone).trim(), "i");
    }

    if (gender) {
        query.gender = new RegExp(String(gender).trim(), "i");
    }

    if (email) {
        query.email = new RegExp(String(email).trim(), "i");
    }

    if (search) {
        const regex = new RegExp(String(search).trim(), "i");
        query.$or = [
            { fullName: regex },
            { phone: regex },
            { gender: regex },
            { email: regex },
        ];
    }

    const [total, data] = await Promise.all([
        Parent.countDocuments(query),
        Parent.find(query)
            .select("fullName phone gender email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(perPage)
            .lean(),
    ]);

    return {
        data,
        pagination: {
            total,
            page: currentPage,
            limit: perPage,
            totalPages: calcTotalPages(total, perPage),
        },
    };
};

const displayParentFullDetailsRepositories = async (id) => {
    const parent = await Parent.findOne({ _id: id, role: "Parent" })
        .select("-refreshTokens -firebaseTokens")
        .lean();
    if (!parent) return null;

    const skaters = await getSkatersForParent(id);

    return { ...parent, skaters };
};

export {
    afterLoginParentFormRepositories,
    appendSkatersToParentRepositories,
    findParentByIdRepositories,
    findUserByPhoneOrEmailRepositories,
    displayAllParentRepositories,
    displayParentFullDetailsRepositories,
}