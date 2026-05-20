import { after_login_skater_form_repositories, delete_skater_repositories, get_all_discipline_repositories, get_all_skating_event_categories_full_repositories, get_all_skating_event_categories_repositories, get_skater_digital_id_card_repositories, get_skater_profile_repositories, get_skater_results_repositories, update_skater_profile_repositories } from "./skater.repositories.js";

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

const get_all_skating_event_categories_service = async () => {
    return await get_all_skating_event_categories_repositories();
};

const get_all_skating_event_categories_full_service = async () => {
    return await get_all_skating_event_categories_full_repositories();
};

const get_all_discipline_service = async () => {
    return await get_all_discipline_repositories();
}

const get_skater_results_service = async (userId) => {
    return await get_skater_results_repositories(userId);
}

export {
    after_login_form_skater_service,
    get_skater_profile_service,
    get_skater_digital_id_card_service,
    update_skater_profile_service,
    deleteUser_skater_service,
    get_all_skating_event_categories_service,
    get_all_skating_event_categories_full_service,
    get_all_discipline_service,
    get_skater_results_service,
}