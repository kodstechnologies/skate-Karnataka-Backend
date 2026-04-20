import { apply_request_repositories, create_certificate_repositories, display_all_certificate_repositories, getKRSAID } from "./certificate.repositories.js";

const create_certificate_services = async (data) => {
    await create_certificate_repositories(data);
}

const display_all_certificate_service = async ({ id, page, limit }) => {
    console.log(id, page, limit, "=====");

    const krsaID = await getKRSAID(id);
    return await display_all_certificate_repositories(krsaID, page, limit);
};

const apply_request_schema = async (id) => {
    await apply_request_repositories(id);
}

export {
    create_certificate_services,
    display_all_certificate_service,
    apply_request_schema,
}