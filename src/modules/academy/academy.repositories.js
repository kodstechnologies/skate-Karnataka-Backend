import { Academy } from "./academy.model.js";

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


export{
    afterLoginClubFormRepositories,
}