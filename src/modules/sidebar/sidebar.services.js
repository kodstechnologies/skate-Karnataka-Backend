import mongoose from "mongoose";
import { AppError } from "../../util/common/AppError.js";
import {
    bulk_update_order_repositories,
    create_sidebar_repositories,
    get_active_sidebar_repositories,
    get_sidebar_by_id_repositories,
    get_sidebar_by_route_repositories,
    soft_delete_sidebar_repositories,
    update_sidebar_repositories,
} from "./sidebar.repositories.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id));

const normalizeRoute = (route) => {
    const value = String(route || "").trim();
    if (!value) return "";
    return value.startsWith("/") ? value : `/${value}`;
};

const deriveSlug = (route, slug) => {
    if (slug && String(slug).trim()) return String(slug).trim();
    const path = normalizeRoute(route).replace(/\/+$/, "") || "/";
    const segment = path.split("/").filter(Boolean).pop();
    return segment || "home";
};

const get_active_sidebar_service = async () => {
    return await get_active_sidebar_repositories();
};

const create_sidebar_service = async (payload) => {
    const title = String(payload?.title || "").trim();
    const route = normalizeRoute(payload?.route);
    const icon = String(payload?.icon || "").trim();
    const order = Number(payload?.order);
    const parentId =
        payload?.parentId === null || payload?.parentId === undefined || payload?.parentId === ""
            ? null
            : payload.parentId;

    if (!title) throw new AppError("Title is required", 400);
    if (!route) throw new AppError("Route is required", 400);
    if (!icon) throw new AppError("Icon is required", 400);
    if (!Number.isFinite(order)) throw new AppError("Order must be a number", 400);

    if (parentId !== null) {
        if (!isValidObjectId(parentId)) {
            throw new AppError("Invalid parentId", 400);
        }
        const parent = await get_sidebar_by_id_repositories(parentId);
        if (!parent || parent.isActive === false) {
            throw new AppError("Parent sidebar item not found", 404);
        }
    }

    const existing = await get_sidebar_by_route_repositories(route);
    if (existing) {
        throw new AppError("Sidebar item with this route already exists", 409);
    }

    return await create_sidebar_repositories({
        title,
        route,
        icon,
        parentId,
        order,
        isActive: payload?.isActive !== false,
        slug: deriveSlug(route, payload?.slug),
    });
};

const update_sidebar_service = async (id, payload) => {
    if (!isValidObjectId(id)) {
        throw new AppError("Invalid sidebar id", 400);
    }

    const existing = await get_sidebar_by_id_repositories(id);
    if (!existing) {
        throw new AppError("Sidebar item not found", 404);
    }

    const updatePayload = {};

    if (typeof payload?.title !== "undefined") {
        const title = String(payload.title || "").trim();
        if (!title) throw new AppError("Title is required", 400);
        updatePayload.title = title;
    }

    if (typeof payload?.route !== "undefined") {
        const route = normalizeRoute(payload.route);
        if (!route) throw new AppError("Route is required", 400);
        const routeConflict = await get_sidebar_by_route_repositories(route);
        if (routeConflict && String(routeConflict._id) !== String(id)) {
            throw new AppError("Sidebar item with this route already exists", 409);
        }
        updatePayload.route = route;
        updatePayload.slug = deriveSlug(route, payload?.slug ?? existing.slug);
    }

    if (typeof payload?.icon !== "undefined") {
        const icon = String(payload.icon || "").trim();
        if (!icon) throw new AppError("Icon is required", 400);
        updatePayload.icon = icon;
    }

    if (typeof payload?.order !== "undefined") {
        const order = Number(payload.order);
        if (!Number.isFinite(order)) throw new AppError("Order must be a number", 400);
        updatePayload.order = order;
    }

    if (typeof payload?.isActive !== "undefined") {
        updatePayload.isActive = Boolean(payload.isActive);
    }

    if (typeof payload?.slug !== "undefined" && typeof payload?.route === "undefined") {
        updatePayload.slug = deriveSlug(existing.route, payload.slug);
    }

    if (typeof payload?.parentId !== "undefined") {
        if (payload.parentId === null || payload.parentId === "") {
            updatePayload.parentId = null;
        } else {
            if (!isValidObjectId(payload.parentId)) {
                throw new AppError("Invalid parentId", 400);
            }
            if (String(payload.parentId) === String(id)) {
                throw new AppError("Sidebar item cannot be its own parent", 400);
            }
            const parent = await get_sidebar_by_id_repositories(payload.parentId);
            if (!parent) {
                throw new AppError("Parent sidebar item not found", 404);
            }
            updatePayload.parentId = payload.parentId;
        }
    }

    if (!Object.keys(updatePayload).length) {
        throw new AppError("No fields provided to update", 400);
    }

    const updated = await update_sidebar_repositories(id, updatePayload);
    if (!updated) {
        throw new AppError("Sidebar item not found", 404);
    }
    return updated;
};

const soft_delete_sidebar_service = async (id) => {
    if (!isValidObjectId(id)) {
        throw new AppError("Invalid sidebar id", 400);
    }

    const existing = await get_sidebar_by_id_repositories(id);
    if (!existing) {
        throw new AppError("Sidebar item not found", 404);
    }

    const deleted = await soft_delete_sidebar_repositories(id);
    if (!deleted) {
        throw new AppError("Sidebar item not found", 404);
    }
    return deleted;
};

const reorder_sidebar_service = async (items) => {
    if (!Array.isArray(items) || !items.length) {
        throw new AppError("Reorder payload must be a non-empty array", 400);
    }

    const normalized = [];
    for (const item of items) {
        const id = item?._id;
        const order = Number(item?.order);

        if (!isValidObjectId(id)) {
            throw new AppError(`Invalid sidebar id: ${id}`, 400);
        }
        if (!Number.isFinite(order)) {
            throw new AppError(`Invalid order for id ${id}`, 400);
        }

        const existing = await get_sidebar_by_id_repositories(id);
        if (!existing) {
            throw new AppError(`Sidebar item not found: ${id}`, 404);
        }

        normalized.push({ _id: id, order });
    }

    await bulk_update_order_repositories(normalized);
    return { updated: normalized.length };
};

export {
    get_active_sidebar_service,
    create_sidebar_service,
    update_sidebar_service,
    soft_delete_sidebar_service,
    reorder_sidebar_service,
};
