import { Academy } from "./academy.model.js";
import { paginate } from "../../util/common/paginate.js";
import mongoose from "mongoose";
import { District } from "../district/district.model.js";

const afterLoginClubFormRepositories = async (data, id) => {
    const updated = await Academy.findOneAndUpdate(
        { _id: id, role: "Academy" },
        {
            $set: {
                ...data,
                verify: true,
            },
        },
        { new: true, runValidators: true }
    );

    if (!updated) {
        throw new Error("Academy not found or role mismatch");
    }

    return updated;
};

const displayAllAcademyRepositories = async ({
    page,
    limit,
    search,
    fullName,
    phone,
    address,
    gender,
    email,
    district,
}) => {
    const { skip, limit: perPage, page: currentPage } = paginate(page, limit);
    const query = { role: "Academy" };
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
        return normalized !== undefined && normalized !== null && String(normalized).trim() !== "";
    };

    if (hasValue(fullName)) {
        query.fullName = new RegExp(String(normalizeQueryValue(fullName)).trim(), "i");
    }
    if (hasValue(phone)) {
        query.phone = new RegExp(String(normalizeQueryValue(phone)).trim(), "i");
    }
    if (hasValue(address)) {
        query.address = new RegExp(String(normalizeQueryValue(address)).trim(), "i");
    }
    if (hasValue(gender)) {
        query.gender = new RegExp(String(normalizeQueryValue(gender)).trim(), "i");
    }
    if (hasValue(email)) {
        query.email = new RegExp(String(normalizeQueryValue(email)).trim(), "i");
    }
    if (hasValue(district)) {
        const districtValue = String(normalizeQueryValue(district)).trim();
        if (mongoose.Types.ObjectId.isValid(districtValue)) {
            query.district = districtValue;
        } else {
            const matchingDistricts = await District.find({
                name: new RegExp(districtValue, "i"),
            }).select("_id").lean();
            query.district = { $in: matchingDistricts.map((item) => item._id) };
        }
    }

    if (hasValue(search)) {
        const regex = new RegExp(String(normalizeQueryValue(search)).trim(), "i");
        query.$or = [
            { fullName: regex },
            { phone: regex },
            { address: regex },
            { gender: regex },
            { email: regex },
        ];
    }

    const [total, data] = await Promise.all([
        Academy.countDocuments(query),
        Academy.find(query)
            .select("_id fullName phone address district gender countryCode email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(perPage)
            .lean(),
    ]);

    const districtIds = [
        ...new Set(
            data
                .map((item) => item?.district)
                .filter((value) => mongoose.Types.ObjectId.isValid(String(value)))
                .map((value) => String(value))
        ),
    ];

    const districtDocs = districtIds.length
        ? await District.find({ _id: { $in: districtIds } }).select("_id name").lean()
        : [];
    const districtNameMap = new Map(
        districtDocs.map((doc) => [String(doc._id), doc.name || ""])
    );

    const formattedData = data.map((item) => ({
        ...item,
        district: item?.district || null,
        districtName: districtNameMap.get(String(item?.district || "")) || "",
    }));

    return {
        data: formattedData,
        pagination: {
            total,
            page: currentPage,
            limit: perPage,
            totalPages: Math.ceil(total / perPage),
        },
    };
};


export{
    afterLoginClubFormRepositories,
    displayAllAcademyRepositories,
}