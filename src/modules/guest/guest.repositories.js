import { Guest } from "./guest.model.js";

const afterLoginGuestFormRepositories = async (data, id) => {
    const updated = await Guest.findOneAndUpdate(
        { _id: id, role: "Guest" },
        {
            $set: {
                ...data,
                verify: true,
            },
        },
        { new: true, runValidators: true }
    );

    if (!updated) {
        throw new Error("Guest not found or role mismatch");
    }

    return updated;
};

export {
    afterLoginGuestFormRepositories
}