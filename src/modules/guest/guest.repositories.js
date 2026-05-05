import { ContactUS } from "./contactUs.model.js";
import { FeedBack } from "./feedBack.model.js";
import { Guest } from "./guest.model.js";
import { paginate } from "../../util/common/paginate.js";
import { News } from "./news.model.js";
import { Event } from "../event/event.model.js";
import { Discipline } from "./disciplines.model.js";
import { Circular } from "./circular.model.js";
import { KRSAabout } from "./KRSAabout.model.js";
import { SponsorshipAndDonation } from "./sponsorshipAndDonation.model.js";

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

export const displayFeedbackRepositories = async ({ page, limit, search }) => {
    const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);
    const term = typeof search === "string" ? search.trim() : "";
    const filter =
        term.length > 0
            ? {
                $or: [
                    { fullName: { $regex: escapeRegExp(term), $options: "i" } },
                    { email: { $regex: escapeRegExp(term), $options: "i" } },
                    { phone: { $regex: escapeRegExp(term), $options: "i" } },
                ],
            }
            : {};

    const [total, data] = await Promise.all([
        FeedBack.countDocuments(filter),
        FeedBack.find(filter)
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

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const displayNewsRepositories = async ({ page, limit, search }) => {
    const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);

    const term = typeof search === "string" ? search.trim() : "";
    const filter =
        term.length > 0
            ? { heading: { $regex: escapeRegExp(term), $options: "i" } }
            : {};

    const [total, data] = await Promise.all([
        News.countDocuments(filter),
        News.find(filter)
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

export const displayDisciplinesRepositories = async ({ page, limit, search }) => {
    const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);

    const term = typeof search === "string" ? search.trim() : "";
    const filter =
        term.length > 0
            ? { title: { $regex: escapeRegExp(term), $options: "i" } }
            : {};

    const [total, data] = await Promise.all([
        Discipline.countDocuments(filter),
        Discipline.find(filter)
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

export const displayCircularRepositories = async ({ page, limit, search }) => {
    const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);

    const term = typeof search === "string" ? search.trim() : "";
    const filter =
        term.length > 0
            ? { heading: { $regex: escapeRegExp(term), $options: "i" } }
            : {};

    const [total, data] = await Promise.all([
        Circular.countDocuments(filter),
        Circular.find(filter)
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

export const displayLatestAboutRepositories = async () => {
    return KRSAabout.findOne().sort({ createdAt: -1 }).lean();
};

export const displayAboutGuestRepositories = async () => {
    const doc = await KRSAabout.findOne()
        .sort({ createdAt: -1 })
        .select("about img")
        .lean();

    if (!doc) {
        return { about: null, img: null };
    }

    const imgs = Array.isArray(doc.img) ? doc.img : [];
    return {
        about: doc.about,
        img: imgs.length > 0 ? imgs[imgs.length - 1] : null,
    };
};

export const addAboutRepositories = async (data) => {
    return KRSAabout.create(data);
};

export const updateLatestAboutRepositories = async (data) => {
    return KRSAabout.findOneAndUpdate(
        {},
        { $set: data },
        { sort: { createdAt: -1 }, new: true, runValidators: true }
    ).lean();
};

export const deleteAllAboutRepositories = async () => {
    const result = await KRSAabout.deleteMany({});
    return { deletedCount: result.deletedCount };
};

export const displaySponsorshipDonationsRepositories = async ({ page, limit, search, supportType }) => {
    const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);
    const term = typeof search === "string" ? search.trim() : "";

    const filter = {};
    if (term.length > 0) {
        filter.$or = [
            { brandName: { $regex: escapeRegExp(term), $options: "i" } },
            { title: { $regex: escapeRegExp(term), $options: "i" } },
            { support: { $regex: escapeRegExp(term), $options: "i" } },
            { donorName: { $regex: escapeRegExp(term), $options: "i" } },
        ];
    }

    const normalizedType = typeof supportType === "string" ? supportType.trim().toLowerCase() : "";
    if (normalizedType === "sponsorship" || normalizedType === "donation") {
        filter.supportType = normalizedType;
    }

    const [total, data] = await Promise.all([
        SponsorshipAndDonation.countDocuments(filter),
        SponsorshipAndDonation.find(filter)
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

export const addSponsorshipDonationRepositories = async (data) => {
    return SponsorshipAndDonation.create(data);
};

export const displaySingleSponsorshipDonationRepositories = async (id) => {
    return SponsorshipAndDonation.findById(id).lean();
};

export const updateSponsorshipDonationRepositories = async (id, data) => {
    return SponsorshipAndDonation.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true }
    ).lean();
};

export const deleteSponsorshipDonationRepositories = async (id) => {
    return SponsorshipAndDonation.findByIdAndDelete(id).lean();
};