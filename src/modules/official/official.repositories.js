import { Official } from "./official.model.js";

const afterLoginOfficialFormRepositories = async (data, id) => {
    const updated = await Official.findOneAndUpdate(
        { _id: id, role: "Official" },
        {
            $set: {
                ...data,
                verify: true,
            },
        },
        { new: true, runValidators: true }
    );

    if (!updated) {
        throw new Error("Official not found or role mismatch");
    }

    return updated;
};

export {
    afterLoginOfficialFormRepositories,
}