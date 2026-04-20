import { School } from "./school.model.js";

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

export {
    afterLoginSchoolFormRepositories,
}