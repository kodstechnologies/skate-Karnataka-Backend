import { AppError } from "../../util/common/AppError.js";
import { BaseAuth } from "../auth/baseAuth.model.js";
import { Official } from "./official.model.js";
import { paginate } from "../../util/common/paginate.js";
import mongoose from "mongoose";
import { District } from "../district/district.model.js";
import { Club } from "../club/club.model.js";

const OFFICIAL_ROLES = ["Official", "official", "officials"];

const afterLoginOfficialFormRepositories = async (data, id) => {
    const existingUser = await BaseAuth.findOne({
        _id: id,
        role: { $in: OFFICIAL_ROLES },
    })
        .select("_id role")
        .lean();

    if (!existingUser) {
        throw new AppError("Official not found", 404);
    }

    const { documents, ...restData } = data;
    const setPayload = {
        ...restData,
        role: "Official",
        verify: true,
    };

    const updateOperation = { $set: setPayload };

    if (Array.isArray(documents) && documents.length > 0) {
        updateOperation.$push = {
            documents: { $each: documents },
        };
    }

    const updated = await BaseAuth.findByIdAndUpdate(id, updateOperation, {
        new: true,
        runValidators: true,
    });

    if (!updated) {
        throw new AppError("Official not found", 404);
    }

    const populated = await Official.findById(id)
        .populate("district")
        .populate("club");
    return populated || updated;
};

const displayAllOfficialRepositories = async ({
    page,
    limit,
    search,
    fullName,
    phone,
    address,
    district,
    gender,
    email,
}) => {
    const { skip, limit: perPage, page: currentPage } = paginate(page, limit);
    const query = { role: "Official" };
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
    if (hasValue(gender)) {
        query.gender = new RegExp(String(normalizeQueryValue(gender)).trim(), "i");
    }
    if (hasValue(email)) {
        query.email = new RegExp(String(normalizeQueryValue(email)).trim(), "i");
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
        Official.countDocuments(query),
        Official.find(query)
            .select("_id fullName phone address district gender email")
            .populate("district", "name")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(perPage)
            .lean(),
    ]);

    const formattedData = data.map((item) => ({
        ...item,
        district: item?.district?._id || item?.district || null,
        districtName: item?.district?.name || "",
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

const displayOfficialfullDetailsRepositories = async (id) => {
    const official = await Official.findOne({ _id: id, role: "Official" })
        .select("-refreshTokens -firebaseTokens")
        .lean();
    if (!official) {
        return null;
    }

    const districtId = official?.district;
    const clubId = official?.club;

    let districtName = "";
    if (districtId && mongoose.Types.ObjectId.isValid(String(districtId))) {
        const district = await District.findById(districtId).select("name").lean();
        districtName = district?.name || "";
    }

    let clubName = "";
    if (clubId && mongoose.Types.ObjectId.isValid(String(clubId))) {
        const club = await Club.findById(clubId).select("name").lean();
        clubName = club?.name || "";
    }

    return {
        ...official,
        district: districtId || null,
        districtName,
        club: clubId || null,
        clubName,
    };
};

export {
    afterLoginOfficialFormRepositories,
    displayAllOfficialRepositories,
    displayOfficialfullDetailsRepositories,
}