import { Academy } from "./academy.model.js";
import { paginate } from "../../util/common/paginate.js";

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

const displayAllAcademyRepositories = async ({ page, limit }) => {
    const { skip, limit: perPage, page: currentPage } = paginate(page, limit);
    const query = { role: "Academy" };

    const [total, data] = await Promise.all([
        Academy.countDocuments(query),
        Academy.find(query)
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


export{
    afterLoginClubFormRepositories,
    displayAllAcademyRepositories,
}