import { Parent } from "./parent.model.js";

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

export {
    afterLoginParentFormRepositories,
}