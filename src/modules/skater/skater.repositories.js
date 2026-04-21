import { BaseAuth } from "../auth/baseAuth.model.js";
import { Skater } from "./skater.model.js";

const after_login_skater_form_repositories = async (data, id) => {
    console.log(data, ",,,,")
    const setPayload = {
        ...data,
        verify: true,
    };

    if (data?.club) {
        setPayload.clubStatus = "apply";
    }

    const updated = await Skater.findOneAndUpdate(
        { _id: id, role: "Skater" },
        {
            $set: {
                ...setPayload,
            },
        },
        { new: true, runValidators: true }
    )
        .populate("district")
        .populate("club");

    if (!updated) {
        throw new Error("Skater not found or role mismatch");
    }

    return updated;
};

const get_skater_profile_repositories = async (id) => {
    const profile = await Skater.findById(id).select("photo fullName krsaId discipline").lean();
    console.log(profile, "profile ...");
    return profile;
};

const get_skater_digital_id_card_repositories = async (id) => {
    const profile = await Skater.findById(id).select("createdAt photo fullName krsaId dob category club").populate("club", "name").lean();
    console.log(profile, "profile ...");
    return profile;
}

const update_skater_profile_repositories = async(userData, updateData) =>{
    
}

const delete_skater_repositories = async (userId) => {
    await BaseAuth.findByIdAndDelete(userId);
}


export {
    after_login_skater_form_repositories,
    get_skater_profile_repositories,
    get_skater_digital_id_card_repositories,
    update_skater_profile_repositories,
    delete_skater_repositories,
}