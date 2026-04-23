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

const displayAllParentRepositories = async ({ page, limit, search }) => {
    const { skip, limit: perPage, page: currentPage } = paginate(page, limit);

    const query = { role: "Parent" };

    if (search) {
        const regex = new RegExp(search, "i");
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

export {
    afterLoginParentFormRepositories,
    displayAllParentRepositories,
}