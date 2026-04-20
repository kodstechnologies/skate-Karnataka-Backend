import { after_login_skater_form_repositories, delete_skater_repositories, get_skater_digital_id_card_repositories, get_skater_profile_repositories, update_skater_profile_repositories } from "./skater.repositories.js";

const after_login_form_skater_service = async (data, id) => {
    await after_login_skater_form_repositories(data, id);
}

const get_skater_profile_service = async(id) =>{
    return await get_skater_profile_repositories(id);
}

const get_skater_digital_id_card_service = async(id) =>{
    return get_skater_digital_id_card_repositories(id);
}

const update_skater_profile_service = async (userData, updateData) => {
    await update_skater_profile_repositories(userData, updateData);
};
const deleteUser_skater_service = async (userData) => {
    console.log("🚀 ~ DeleteUserService ~ userData:", userData._id)
    await delete_skater_repositories(userData._id);
};

export {
    after_login_form_skater_service,
    get_skater_profile_service,
    get_skater_digital_id_card_service,
    update_skater_profile_service,
    deleteUser_skater_service,
}