import { AppError } from "../../util/common/AppError.js";
import { BaseAuth } from "../auth/baseAuth.model.js";
import { School } from "./school.model.js";
import { paginate, calcTotalPages } from "../../util/common/paginate.js";
import mongoose from "mongoose";
import { District } from "../district/district.model.js";

const SCHOOL_ROLES = ["School", "school"];

const afterLoginSchoolFormRepositories = async (data, id) => {
    if (!mongoose.Types.ObjectId.isValid(String(id))) {
        throw new AppError("Invalid school id", 400);
    }

    const existingUser = await School.findOne({
        _id: id,
        role: { $in: SCHOOL_ROLES },
    })
        .select("_id role")
        .lean();

    if (!existingUser) {
        throw new AppError("School not found", 404);
    }

    const {
        documents,
        role: _ignoredRole,
        __t: _ignoredDiscriminator,
        ...restData
    } = data;
    const setPayload = {
        ...restData,
        verify: true,
    };
    delete setPayload.role;
    delete setPayload.__t;
    delete setPayload.krsaId;

    if (restData.district) {
        setPayload.district = new mongoose.Types.ObjectId(String(restData.district));
    }

    const updateOperation = { $set: setPayload };

    if (Array.isArray(documents) && documents.length > 0) {
        updateOperation.$push = {
            documents: { $each: documents },
        };
    }

    const updated = await BaseAuth.findOneAndUpdate(
        { _id: id, role: { $in: SCHOOL_ROLES } },
        updateOperation,
        { new: true, strict: false }
    );

    if (!updated) {
        throw new AppError("School not found", 404);
    }

    const profile = await School.findOne({ _id: id, role: { $in: SCHOOL_ROLES } })
        .select("-refreshTokens -firebaseTokens")
        .populate("district", "name")
        .lean();

    if (!profile) {
        throw new AppError("School not found", 404);
    }

    return {
        ...profile,
        districtName: profile.district?.name || "",
    };
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
            .select("_id schoolName fullName phone address district gender countryCode email")
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
            totalPages: calcTotalPages(total, perPage),
        },
    };
};

const displaySchoolFullDetailsRepositories = async (id) => {
    const school = await School.findOne({ _id: id, role: "School" })
        .select("-refreshTokens -firebaseTokens")
        .lean();
    if (!school) {
        return null;
    }

    const districtId = school?.district;
    let districtName = "";
    if (districtId && mongoose.Types.ObjectId.isValid(String(districtId))) {
        const district = await District.findById(districtId).select("name").lean();
        districtName = district?.name || "";
    }

    return {
        ...school,
        district: districtId || null,
        districtName,
    };
};

export {
    afterLoginSchoolFormRepositories,
    displayAllSchoolRepositories,
    displaySchoolFullDetailsRepositories,
}