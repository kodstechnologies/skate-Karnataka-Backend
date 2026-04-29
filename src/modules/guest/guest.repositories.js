import { ContactUS } from "./contactUs.model.js";
import { Guest } from "./guest.model.js";

export const afterLoginGuestFormRepositories = async (data, id) => {
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

export const displayContactUsRepositories = async () => {

    const data = await ContactUS.findOne()
        .sort({ createdAt: -1 })
        .lean();

    return data;
};

export const addContactUsRepositories = async (data) => {
    console.log(data,"=====")
    const contact = await ContactUS.create(data);
};