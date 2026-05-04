import { ContactUS } from "./contactUs.model.js";
import { FeedBack } from "./feedBack.model.js";
import { Guest } from "./guest.model.js";
import { paginate } from "../../util/common/paginate.js";
import { News } from "./news.model.js";
import { Event } from "../event/event.model.js";
import { Discipline } from "./disciplines.model.js";
import { Circular } from "./circular.model.js";

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

export const displayFeedbackRepositories = async ({ page, limit }) => {
    const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);

    const [total, data] = await Promise.all([
        FeedBack.countDocuments(),
        FeedBack.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageLimit)
            .lean(),
    ]);

    return {
        data,
        pagination: {
            total,
            page: currentPage,
            limit: pageLimit,
            totalPages: Math.ceil(total / pageLimit),
        },
    };
};

export const addFeedBackRepositories = async (data) => {
    return FeedBack.create(data);
};

export const displayNewsRepositories = async ({ page, limit }) => {
    const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);

    const [total, data] = await Promise.all([
        News.countDocuments(),
        News.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageLimit)
            .lean(),
    ]);

    return {
        data,
        pagination: {
            total,
            page: currentPage,
            limit: pageLimit,
            totalPages: Math.ceil(total / pageLimit),
        },
    };
};

export const addNewsRepositories = async (data) => {
    return News.create(data);
};

export const displaySingleNewsRepositories = async (id) => {
    return News.findById(id).lean();
};

export const updateNewsRepositories = async (id, data) => {
    return News.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
    ).lean();
};

export const deleteNewsRepositories = async (id) => {
    return News.findByIdAndDelete(id).lean();
};

export const displayStateLatestEventsRepositories = async ({ page, limit }) => {
    const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);

    const query = { eventType: "State" };

    const [total, data] = await Promise.all([
        Event.countDocuments(query),
        Event.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageLimit)
            .lean(),
    ]);

    return {
        data,
        pagination: {
            total,
            page: currentPage,
            limit: pageLimit,
            totalPages: Math.ceil(total / pageLimit),
        },
    };
};

export const displayStateLatestSingleEventsRepositories = async (id) => {
    return Event.findOne({ _id: id, eventType: "State" }).lean();
};

export const displayDisciplinesRepositories = async ({ page, limit }) => {
    const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);

    const [total, data] = await Promise.all([
        Discipline.countDocuments(),
        Discipline.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageLimit)
            .lean(),
    ]);

    return {
        data,
        pagination: {
            total,
            page: currentPage,
            limit: pageLimit,
            totalPages: Math.ceil(total / pageLimit),
        },
    };
};

export const displaySingleDisciplineRepositories = async (id) => {
    return Discipline.findById(id).lean();
};

export const addDisciplineRepositories = async (data) => {
    return Discipline.create(data);
};

export const updateDisciplineRepositories = async (id, data) => {
    return Discipline.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
    ).lean();
};

export const deleteDisciplineRepositories = async (id) => {
    return Discipline.findByIdAndDelete(id).lean();
};

export const displayCircularRepositories = async ({ page, limit }) => {
    const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);

    const [total, data] = await Promise.all([
        Circular.countDocuments(),
        Circular.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageLimit)
            .lean(),
    ]);

    return {
        data,
        pagination: {
            total,
            page: currentPage,
            limit: pageLimit,
            totalPages: Math.ceil(total / pageLimit),
        },
    };
};

export const displaySingleCircularRepositories = async (id) => {
    return Circular.findById(id).lean();
};

export const addCircularRepositories = async (data) => {
    return Circular.create(data);
};

export const updateCircularRepositories = async (id, data) => {
    return Circular.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
    ).lean();
};

export const deleteCircularRepositories = async (id) => {
    return Circular.findByIdAndDelete(id).lean();
};