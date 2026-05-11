import { AppError } from "../../util/common/AppError.js";
import {
    create_discipline_repositories,
    delete_discipline_repositories,
    get_all_discipline_repositories,
    get_discipline_by_name_repositories,
    get_single_discipline_repositories,
    update_discipline_repositories,
} from "./discipline.repositories.js";

const get_all_discipline_service = async () => {
    return await get_all_discipline_repositories();
};

const get_single_discipline_service = async (id) => {
    const discipline = await get_single_discipline_repositories(id);
    if (!discipline) {
        throw new AppError("Discipline not found", 404);
    }
    return discipline;
};

const create_discipline_service = async (payload) => {
    const name = String(payload?.name || "").trim();
    if (!name) {
        throw new AppError("Discipline name is required", 400);
    }

    const existing = await get_discipline_by_name_repositories(name);
    if (existing) {
        throw new AppError("Discipline already exists", 409);
    }

    return await create_discipline_repositories({ name });
};

const update_discipline_service = async (id, payload) => {
    const updatePayload = {};
    if (typeof payload?.name !== "undefined") {
        const name = String(payload.name || "").trim();
        if (!name) {
            throw new AppError("Discipline name is required", 400);
        }
        const existing = await get_discipline_by_name_repositories(name);
        if (existing && String(existing._id) !== String(id)) {
            throw new AppError("Discipline already exists", 409);
        }
        updatePayload.name = name;
    }

    if (!Object.keys(updatePayload).length) {
        throw new AppError("No fields provided to update", 400);
    }

    const updated = await update_discipline_repositories(id, updatePayload);
    if (!updated) {
        throw new AppError("Discipline not found", 404);
    }
    return updated;
};

const delete_discipline_service = async (id) => {
    const deleted = await delete_discipline_repositories(id);
    if (!deleted) {
        throw new AppError("Discipline not found", 404);
    }
    return { deleted: true };
};

export {
    get_all_discipline_service,
    get_single_discipline_service,
    create_discipline_service,
    update_discipline_service,
    delete_discipline_service,
};
