import { Parent } from "./parent.model.js";
import { paginate } from "../../util/common/paginate.js";

const afterLoginParentFormRepositories = async (data, id) => {
    const updated = await Parent.findOneAndUpdate(
        { _id: id, role: "Parent" },
        {
            $set: {
                ...data,
                verify: true,
            },
        },
        { new: true, runValidators: true }
    );

    if (!updated) {
        throw new Error("Parent not found or role mismatch");
    }

    return updated;
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
            totalPages: Math.ceil(total / perPage),
        },
    };
};

const displayParentFullDetailsRepositories = async (id) => {
    return await Parent.findOne({ _id: id, role: "Parent" })
        .select("-refreshTokens -firebaseTokens")
        .lean();
};

export {
    afterLoginParentFormRepositories,
    displayAllParentRepositories,
    displayParentFullDetailsRepositories,
}