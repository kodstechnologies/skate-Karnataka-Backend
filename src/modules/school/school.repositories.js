import { School } from "./school.model.js";
import { paginate } from "../../util/common/paginate.js";

const afterLoginSchoolFormRepositories = async (data, id) => {
    const updated = await School.findOneAndUpdate(
        { _id: id, role: "School" },
        {
            $set: {
                ...data,
                verify: true,
            },
        },
        { new: true, runValidators: true }
    );

    if (!updated) {
        throw new Error("School not found or role mismatch");
    }

    return updated;
};

const displayAllSchoolRepositories = async ({
    page,
    limit,
    search,
    email,
    gender,
    address,
    phone,
    fullName,
}) => {
    const { skip, limit: perPage, page: currentPage } = paginate(page, limit);
    const query = { role: "School" };
    const normalizeQueryValue = (value) => {
        if (Array.isArray(value)) {
            const firstNonEmpty = value.find(
                (item) => item !== undefined && item !== null && String(item).trim() !== ""
            );
            return firstNonEmpty ?? "";
        }
        return value;
    };

    const hasValue = (value) => {
        const normalized = normalizeQueryValue(value);
        return (
            normalized !== undefined &&
            normalized !== null &&
            String(normalized).trim() !== ""
        );
    };

    if (hasValue(email)) {
        query.email = new RegExp(String(normalizeQueryValue(email)).trim(), "i");
    }

    if (hasValue(gender)) {
        query.gender = new RegExp(String(normalizeQueryValue(gender)).trim(), "i");
    }

    if (hasValue(address)) {
        query.address = new RegExp(String(normalizeQueryValue(address)).trim(), "i");
    }

    if (hasValue(phone)) {
        query.phone = new RegExp(String(normalizeQueryValue(phone)).trim(), "i");
    }

    if (hasValue(fullName)) {
        query.fullName = new RegExp(String(normalizeQueryValue(fullName)).trim(), "i");
    }

    if (hasValue(search)) {
        const regex = new RegExp(String(normalizeQueryValue(search)).trim(), "i");
        query.$or = [
            { email: regex },
            { gender: regex },
            { address: regex },
            { phone: regex },
            { fullName: regex },
        ];
    }

    const [total, data] = await Promise.all([
        School.countDocuments(query),
        School.find(query)
            .select("_id fullName phone address district gender countryCode email")
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
            totalPages: Math.ceil(total / perPage),
        },
    };
};

export {
    afterLoginSchoolFormRepositories,
    displayAllSchoolRepositories,
}