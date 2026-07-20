import { Sidebar } from "./sidebar.model.js";

const get_active_sidebar_repositories = async () => {
    return await Sidebar.find({ isActive: true })
        .sort({ order: 1 })
        .select("_id title route icon parentId order slug")
        .lean();
};

const get_all_sidebar_repositories = async () => {
    return await Sidebar.find({})
        .sort({ order: 1 })
        .lean();
};

const get_sidebar_by_id_repositories = async (id) => {
    return await Sidebar.findById(id).lean();
};

const get_sidebar_by_route_repositories = async (route) => {
    return await Sidebar.findOne({ route }).lean();
};

const create_sidebar_repositories = async (payload) => {
    return await Sidebar.create(payload);
};

const update_sidebar_repositories = async (id, payload) => {
    return await Sidebar.findByIdAndUpdate(
        id,
        { $set: payload },
        { new: true, runValidators: true }
    ).lean();
};

const soft_delete_sidebar_repositories = async (id) => {
    return await Sidebar.findByIdAndUpdate(
        id,
        { $set: { isActive: false } },
        { new: true }
    ).lean();
};

const bulk_update_order_repositories = async (items) => {
    const ops = items.map(({ _id, order }) => ({
        updateOne: {
            filter: { _id },
            update: { $set: { order } },
        },
    }));

    if (!ops.length) return { modifiedCount: 0 };

    return await Sidebar.bulkWrite(ops);
};

export {
    get_active_sidebar_repositories,
    get_all_sidebar_repositories,
    get_sidebar_by_id_repositories,
    get_sidebar_by_route_repositories,
    create_sidebar_repositories,
    update_sidebar_repositories,
    soft_delete_sidebar_repositories,
    bulk_update_order_repositories,
};
