import { ContactUS } from "./contactUs.model.js";
import { FeedBack } from "./feedBack.model.js";
import { Guest } from "./guest.model.js";
import { BaseAuth } from "../auth/baseAuth.model.js";
import { AppError } from "../../util/common/AppError.js";
import { paginate } from "../../util/common/paginate.js";
import { News } from "./news.model.js";
import { Event } from "../event/event.model.js";
import { Discipline } from "./disciplines.model.js";
import { Circular } from "./circular.model.js";
import { KRSAabout } from "./KRSAabout.model.js";
import { SponsorshipAndDonation } from "./sponsorshipAndDonation.model.js";
import { District } from "../district/district.model.js";
import { Club } from "../club/club.model.js";
import { Skater } from "../skater/skater.model.js";
import mongoose from "mongoose";
import { Gallery } from "../gallery/gallery.model.js";

const isGuestRole = (role) => {
    const normalized = String(role ?? "").trim().toLowerCase();
    return normalized === "" || normalized === "guest";
};

export const afterLoginGuestFormRepositories = async (data, id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError("Invalid guest id", 400);
    }

    const existingUser = await BaseAuth.findById(id).select("_id role").lean();

    if (!existingUser) {
        throw new AppError("Guest not found", 404);
    }

    if (!isGuestRole(existingUser.role)) {
        throw new AppError("Guest not found or role mismatch", 400);
    }

    const updated = await BaseAuth.findByIdAndUpdate(
        id,
        {
            $set: {
                ...data,
                role: "Guest",
                verify: true,
            },
        },
        { new: true, runValidators: true }
    );

    if (!updated) {
        throw new AppError("Guest not found", 404);
    }

    return (await Guest.findById(id).lean()) || updated;
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

export const displayStateEventsRepositories = async ({ page, limit, search }) => {
    const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);
    const term = typeof search === "string" ? search.trim() : "";

    const filter = { eventType: "State" };
    if (term.length > 0) {
        filter.header = { $regex: escapeRegExp(term), $options: "i" };
    }

    const [total, data] = await Promise.all([
        Event.countDocuments(filter),
        Event.find(filter)
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

export const displayStateEventDetailsWithPodiumRepositories = async (eventId) => {
    const event = await Event.findOne({ _id: eventId, eventType: "State" }).lean();
    if (!event) return null;

    const oid = new mongoose.Types.ObjectId(eventId);
    const usersCol = "baseauths";

    const [podiumRow] = await (await import("../event/eventParticipant.model.js")).EventParticipant
        .aggregate([
            { $match: { eventId: oid } },
            { $unwind: "$categories" },
            {
                $match: {
                    "categories.rank": { $in: [1, 2, 3] },
                    "categories.isDisqualified": { $ne: true },
                },
            },
            { $sort: { "categories.rank": 1, "categories.timeTaken": 1, createdAt: 1 } },
            {
                $group: {
                    _id: "$categories.rank",
                    userId: { $first: "$userId" },
                    participantName: { $first: "$name" },
                },
            },
            {
                $lookup: {
                    from: usersCol,
                    localField: "userId",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    rank: "$_id",
                    name: {
                        $ifNull: ["$user.fullName", "$participantName"],
                    },
                    img: {
                        $ifNull: ["$user.photo", "$user.profile"],
                    },
                },
            },
            {
                $group: {
                    _id: null,
                    podium: { $push: "$$ROOT" },
                },
            },
            { $project: { _id: 0, podium: 1 } },
        ])
        .exec();

    const podium = Array.isArray(podiumRow?.podium) ? podiumRow.podium : [];

    const pick = (rank, customName) => {
        const data = podium.find((p) => p.rank === rank) || {
            rank,
            name: "",
            img: "",
        };

        return {
            ...data,
            name: customName,
        };
    };

    return {
        ...event,
        podium: [
            pick(1, "Nagraj"),
            pick(2, "Bhanu"),
            pick(3, "Sangram"),
        ],
    };
};
export const displayGuestStateMediaRepositories = async ({ page, limit }) => {
    const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);

    const query = {
        ownerType: { $in: ["state", "admin"] },
        $or: [
            { imageUrl: { $nin: [null, ""] } },
            { videoUrl: { $nin: [null, ""] } },
        ],
    };

    const [total, data] = await Promise.all([
        Gallery.countDocuments(query),

        Gallery.find(query)
            .select("_id imageUrl videoUrl title about ownerType createdAt")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageLimit)
            .lean(),
    ]);

    return {
        data: data.map((item) => ({
            _id: item._id,
            imageUrl: item.imageUrl || null,
            videoUrl: item.videoUrl || null,
            type: item.videoUrl ? "video" : "image",
            title: item.title || "",
            about: item.about || "",
            ownerType: item.ownerType || "",
        })),

        pagination: {
            total,
            page: currentPage,
            limit: pageLimit,
            totalPages: Math.ceil(total / pageLimit),
        },
    };
};

export const displayGuestStateMediaDetailsRepositories = async (id) => {
    return Gallery.findOne({ _id: id, ownerType: {$in : ["state","admin"]} })
        .select("_id imageUrl videoUrl title about ownerType createdAt")
        .lean();
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
        return { about: null, img: [] };
    }

    const imgs = Array.isArray(doc.img) ? doc.img : [];
    return {
        about: doc.about,
        img: imgs,
    };
};

export const displayDistrictsRepositories = async ({ page, limit, search }) => {
    const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);
    const term = typeof search === "string" ? search.trim() : "";

    const filter =
        term.length > 0
            ? { name: { $regex: escapeRegExp(term), $options: "i" } }
            : {};

    const [total, data] = await Promise.all([
        District.countDocuments(filter),
        District.find(filter)
            .select("_id name img")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageLimit)
            .lean(),
    ]);

    return {
        data: data.map((district) => ({
            _id: district._id,
            name: district.name || "",
            img: district.img || "",
        })),
        pagination: {
            total,
            page: currentPage,
            limit: pageLimit,
            totalPages: Math.ceil(total / pageLimit),
        },
    };
};

export const displayDistrictDetailsRepositories = async (districtId) => {
    const district = await District.findById(districtId)
        .select("_id name img about officeAddress presidentName rank championships")
        .lean();

    if (!district) {
        return null;
    }

    const clubsQuery = { district: district._id };
    const skatersQuery = { club: { $in: await Club.find(clubsQuery).distinct("_id") } };
    const eventsQuery = { eventType: "District", eventFor: district._id };

    const [totalClubs, totalSkaters, totalEvents] = await Promise.all([
        Club.countDocuments(clubsQuery),
        Skater.countDocuments(skatersQuery),
        Event.countDocuments(eventsQuery),
    ]);

    return {
        districtId: district._id,
        name: district.name || "",
        img: district.img || "",
        about: district.about || "",
        officeAddress: district.officeAddress || "",
        presidentName: district.presidentName || "",
        rank: district.rank || 0,
        championships: district.championships || 0,
        totalClubCount: totalClubs,
        totalSkaterCount: totalSkaters,
        totalEventCount: totalEvents,
    };
};

export const displayDistrictClubsRepositories = async (districtId, { page, limit, search }) => {
    const district = await District.findById(districtId).select("_id name").lean();
    if (!district) {
        return null;
    }

    const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);
    const term = typeof search === "string" ? search.trim() : "";
    const filter = { district: district._id };

    if (term.length > 0) {
        filter.name = { $regex: escapeRegExp(term), $options: "i" };
    }

    const [total, data] = await Promise.all([
        Club.countDocuments(filter),
        Club.find(filter)
            .select("_id name img")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageLimit)
            .lean(),
    ]);

    return {
        district: {
            _id: district._id,
            name: district.name || "",
        },
        data: data.map((club) => ({
            _id: club._id,
            name: club.name || "",
            img: club.img || "",
        })),
        pagination: {
            total,
            page: currentPage,
            limit: pageLimit,
            totalPages: Math.ceil(total / pageLimit),
        },
    };
};

export const displayDistrictClubDetailsRepositories = async ({ districtId, clubId }) => {
    const district = await District.findById(districtId).select("_id name").lean();
    if (!district) {
        return null;
    }

    const club = await Club.findOne({ _id: clubId, district: district._id })
        .select("_id clubId name img officeAddress about districtName rank championships")
        .lean();

    if (!club) {
        return null;
    }

    const totalSkaters = await Skater.countDocuments({ club: club._id });

    return {
        district: {
            _id: district._id,
            name: district.name || "",
        },
        clubId: club.clubId || String(club._id),
        name: club.name || "",
        img: club.img || "",
        officeAddress: club.officeAddress || "",
        about: club.about || "",
        districtName: club.districtName || "",
        rank: club.rank || 0,
        championships: club.championships || 0,
        totalSkaterCount: totalSkaters,
    };
};

export const displayDistrictSkatersRepositories = async (districtId, { page, limit, search }) => {
    const district = await District.findById(districtId).select("_id name").lean();
    if (!district) {
        return null;
    }

    const clubIds = await Club.find({ district: district._id }).distinct("_id");
    const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);
    const term = typeof search === "string" ? search.trim() : "";

    const filter = {
        club: { $in: clubIds },
    };

    if (term.length > 0) {
        filter.fullName = { $regex: escapeRegExp(term), $options: "i" };
    }

    const [total, data] = await Promise.all([
        Skater.countDocuments(filter),
        Skater.find(filter)
            .select("_id fullName photo club")
            .populate("club", "_id name")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageLimit)
            .lean(),
    ]);

    return {
        district: {
            _id: district._id,
            name: district.name || "",
        },
        data: data.map((skater) => ({
            _id: skater._id,
            name: skater.fullName || "",
            img: skater.photo || "",
            club: {
                _id: skater.club?._id || null,
                name: skater.club?.name || "",
            },
        })),
        pagination: {
            total,
            page: currentPage,
            limit: pageLimit,
            totalPages: Math.ceil(total / pageLimit),
        },
    };
};

export const displayDistrictEventsRepositories = async (districtId, { page, limit, search }) => {
    const district = await District.findById(districtId).select("_id name").lean();
    if (!district) {
        return null;
    }

    const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);
    const term = typeof search === "string" ? search.trim() : "";

    const filter = {
        eventType: "District",
        eventFor: district._id,
    };

    if (term.length > 0) {
        filter.header = { $regex: escapeRegExp(term), $options: "i" };
    }

    const [total, data] = await Promise.all([
        Event.countDocuments(filter),
        Event.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageLimit)
            .lean(),
    ]);

    return {
        district: {
            _id: district._id,
            name: district.name || "",
        },
        data,
        pagination: {
            total,
            page: currentPage,
            limit: pageLimit,
            totalPages: Math.ceil(total / pageLimit),
        },
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