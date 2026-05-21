import mongoose from "mongoose";
import { AppError } from "../../util/common/AppError.js";
import { BaseAuth } from "../auth/baseAuth.model.js";
import { DisciplineService } from "../discipline/discipline.model.js";
import { Discipline } from "../guest/disciplines.model.js";
import { listCompetitionCategoryRankingsRepository } from "../event/event.repositories.js";
import { sortCompetitionByTime } from "../../util/competition/rankUtil.js";
import { EventParticipant } from "../event/eventParticipant.model.js";
import SkatingEventCategory from "../event/SkatingEventCategory.model.js";
import { Skater } from "./skater.model.js";

const normalizePhone = (value) => String(value ?? "").trim();

const toDisciplineId = (discipline) => {
    if (discipline == null || discipline === "") return null;

    if (discipline instanceof mongoose.Types.ObjectId) {
        return discipline;
    }

    if (typeof discipline === "string") {
        return discipline.trim();
    }

    if (typeof discipline === "object") {
        if (discipline.name || discipline.title) {
            return null;
        }
        return discipline._id ?? discipline.id ?? null;
    }

    return discipline;
};

const findDisciplineById = async (disciplineId) => {
    if (!disciplineId || !mongoose.Types.ObjectId.isValid(String(disciplineId))) {
        return null;
    }

    const service = await DisciplineService.findById(disciplineId)
        .select("name")
        .lean();
    if (service?.name) {
        return { name: service.name };
    }

    const guest = await Discipline.findById(disciplineId).select("title").lean();
    if (guest?.title) {
        return { name: guest.title };
    }

    return null;
};

const resolveDisciplineName = async (discipline) => {
    if (!discipline) return "";

    if (typeof discipline === "object") {
        if (discipline.name) return discipline.name;
        if (discipline.title) return discipline.title;
    }

    const disciplineId = toDisciplineId(discipline);
    const record = await findDisciplineById(disciplineId);
    if (record?.name) return record.name;

    return typeof discipline === "string" ? discipline : "";
};

const assertUniqueContactForUpdate = async (id, payload, existingUser) => {
    if (payload.phone != null && payload.phone !== "") {
        const phone = normalizePhone(payload.phone);
        payload.phone = phone;

        const currentPhone = normalizePhone(existingUser.phone);
        if (phone !== currentPhone) {
            const phoneOwner = await BaseAuth.findOne({ phone, _id: { $ne: id } })
                .select("_id role")
                .lean();
            if (phoneOwner) {
                throw new AppError(
                    "This phone number is already registered with another account",
                    409
                );
            }
        } else {
            delete payload.phone;
        }
    }

    if (payload.email != null && payload.email !== "") {
        const email = String(payload.email).trim().toLowerCase();
        payload.email = email;

        const currentEmail = existingUser.email
            ? String(existingUser.email).trim().toLowerCase()
            : "";
        if (email !== currentEmail) {
            const emailOwner = await BaseAuth.findOne({ email, _id: { $ne: id } })
                .select("_id")
                .lean();
            if (emailOwner) {
                throw new AppError(
                    "This email is already registered with another account",
                    409
                );
            }
        } else {
            delete payload.email;
        }
    }
};

const SKATER_ROLES = ["Skater", "skater"];

const SKATER_OBJECT_ID_FIELDS = ["category", "discipline", "district", "club"];

const castSkaterObjectIdFields = (payload) => {
    for (const field of SKATER_OBJECT_ID_FIELDS) {
        const value = payload[field];
        if (value == null || value === "") continue;

        const raw = String(value).trim();
        if (mongoose.Types.ObjectId.isValid(raw)) {
            payload[field] = new mongoose.Types.ObjectId(raw);
        }
    }
};

const assertDisciplineExists = async (disciplineId) => {
    if (!disciplineId) return;

    const record = await findDisciplineById(disciplineId);
    if (!record) {
        throw new AppError("Discipline not found", 404);
    }
};

const after_login_skater_form_repositories = async (data, id) => {
    const existingUser = await BaseAuth.findById(id)
        .select("_id role phone email")
        .lean();

    if (!existingUser) {
        throw new AppError("Skater not found", 404);
    }

    const normalizedRole = String(existingUser.role || "").trim().toLowerCase();
    if (
        normalizedRole &&
        !SKATER_ROLES.map((role) => role.toLowerCase()).includes(normalizedRole)
    ) {
        throw new AppError("Skater not found", 404);
    }

    const { documents, ...restData } = data;
    const setPayload = {
        ...restData,
        role: "Skater",
        verify: true,
    };

    if (setPayload.discipline) {
        await assertDisciplineExists(setPayload.discipline);
    }

    castSkaterObjectIdFields(setPayload);

    await assertUniqueContactForUpdate(id, setPayload, existingUser);

    if (data?.club) {
        setPayload.clubStatus = "apply";
    } else {
        setPayload.clubStatus = "join";
    }

    delete setPayload.img;
    delete setPayload.imgKey;
    delete setPayload.photoKey;

    const updateOperation = { $set: setPayload };

    if (Array.isArray(documents) && documents.length > 0) {
        updateOperation.$push = {
            documents: { $each: documents },
        };
    }

    const updated = await BaseAuth.findByIdAndUpdate(id, updateOperation, {
        new: true,
        runValidators: false,
        strict: false,
    });

    if (!updated) {
        throw new AppError("Skater not found", 404);
    }

    const populated = await Skater.findById(id)
        .populate("district")
        .populate("club")
        .populate("category", "typeName")
        .lean();

    const profile = populated ?? updated.toObject?.() ?? updated;

    return {
        ...profile,
        disciplineName: await resolveDisciplineName(profile?.discipline),
    };
};

const attachDisciplineName = async (profile) => {
    if (!profile) return null;

    return {
        ...profile,
        disciplineName: await resolveDisciplineName(profile.discipline),
    };
};

const get_skater_profile_repositories = async (id) => {
    const profile = await Skater.findById(id)
        .select("photo fullName krsaId discipline category")
        .populate("category", "typeName")
        .lean();

    return attachDisciplineName(profile);
};

const get_skater_digital_id_card_repositories = async (id) => {
    const profile = await Skater.findById(id)
        .select("createdAt photo fullName krsaId dob discipline category club")
        .populate("club", "name")
        .populate("category", "typeName")
        .lean();

    return attachDisciplineName(profile);
};

const update_skater_profile_repositories = async (userData, updateData) => {

}

const delete_skater_repositories = async (userId) => {
    await BaseAuth.findByIdAndDelete(userId);
}

const get_all_skating_event_categories_repositories = async () => {
    const categories = await SkatingEventCategory.find({})
        .select("_id typeName")
        .sort({ typeName: 1 })
        .lean();

    return categories.map((category) => ({
        id: String(category._id),
        name: category.typeName || "",
    }));
};

const get_all_skating_event_categories_full_repositories = async () => {
    return await SkatingEventCategory.find({})
        .sort({ typeName: 1 })
        .lean();
};

const get_all_discipline_repositories = async () => {
    const [services, guests] = await Promise.all([
        DisciplineService.find({}).select("_id name").sort({ name: 1 }).lean(),
        Discipline.find({}).select("_id title").sort({ title: 1 }).lean(),
    ]);

    return [
        ...services.map((row) => ({
            _id: row._id,
            name: row.name,
            source: "service",
        })),
        ...guests.map((row) => ({
            _id: row._id,
            name: row.title,
            source: "guest",
        })),
    ];
};

/** Skater results podium: fastest times first, including placeholder (600s) finishers. */
const buildSkaterPodiumTopThree = (results = []) =>
    [...results]
        .filter(
            (row) =>
                !row.isDisqualified &&
                typeof row.timeTaken === "number" &&
                !Number.isNaN(row.timeTaken) &&
                row.timeTaken > 0
        )
        .sort(sortCompetitionByTime)
        .slice(0, 3)
        .map((row, index) => ({
            id: row.userId ? String(row.userId) : null,
            name: row.participantName || "",
            krsaId: row.krsaId || "",
            rank: index + 1,
            timeTaken: row.timeTaken ?? null,
        }));

const parseEventEndDateTime = (eventEndDate, eventEndTime) => {
    if (!eventEndDate) return null;

    const endDate = new Date(eventEndDate);
    if (Number.isNaN(endDate.getTime())) return null;

    const rawTime = String(eventEndTime || "").trim();
    if (!rawTime) {
        endDate.setHours(23, 59, 59, 999);
        return endDate;
    }

    const match = rawTime.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
    if (!match) {
        endDate.setHours(23, 59, 59, 999);
        return endDate;
    }

    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const meridian = (match[3] || "").toUpperCase();

    if (meridian === "PM" && hours < 12) hours += 12;
    if (meridian === "AM" && hours === 12) hours = 0;

    endDate.setHours(hours, minutes, 59, 999);
    return endDate;
};

const get_skater_results_event_repositories = async (userId) => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const now = new Date();

    const participants = await EventParticipant.find({ userId })
        .populate({
            path: "eventId",
            select:
                "header eventType eventStartDate eventEndDate eventStartTime eventEndTime address status colorOne colorTwo textColor",
        })
        .select("eventId ageGroup categories paymentStatus createdAt")
        .sort({ createdAt: -1 })
        .lean();

    const seenEventIds = new Set();
    const events = [];

    for (const participant of participants) {
        const event = participant.eventId;
        if (!event?._id) continue;

        const eventIdStr = String(event._id);
        if (seenEventIds.has(eventIdStr)) continue;
        seenEventIds.add(eventIdStr);

        const eventEnd = event.eventEndDate ? new Date(event.eventEndDate) : null;
        const endDateTime = parseEventEndDateTime(
            event.eventEndDate,
            event.eventEndTime
        );
        const eventEnded = Boolean(endDateTime && now > endDateTime);
        const resultsAvailable =
            participant.paymentStatus === "paid" &&
            eventEnd &&
            !Number.isNaN(eventEnd.getTime()) &&
            eventEnd <= twoDaysAgo;

        events.push({
            participantId: participant._id,
            eventId: event._id,
            eventName: event.header || "",
            eventType: event.eventType || "",
            eventStartDate: event.eventStartDate || null,
            eventEndDate: event.eventEndDate || null,
            eventStartTime: event.eventStartTime || "",
            eventEndTime: event.eventEndTime || "",
            address: event.address || "",
            status: event.status || "",
            colorOne: event.colorOne ?? "#6A11CB",
            colorTwo: event.colorTwo ?? "#2575FC",
            textColor: event.textColor ?? "#FFFFFF",
            ageGroup: participant.ageGroup || "",
            paymentStatus: participant.paymentStatus || "pending",
            eventEnded,
            resultsAvailable,
            categories: (participant.categories || [])
                .map((row, index) => ({
                    eventNo: index + 1,
                    name: String(row?.name || "").trim(),
                }))
                .filter((row) => row.name),
        });
    }

    return events.sort((a, b) => {
        const aEnd = a.eventEndDate ? new Date(a.eventEndDate).getTime() : 0;
        const bEnd = b.eventEndDate ? new Date(b.eventEndDate).getTime() : 0;
        return bEnd - aEnd;
    });
};

const mapCategoryLeaderboard = (results = []) =>
    [...results]
        .filter(
            (row) =>
                !row.isDisqualified &&
                typeof row.timeTaken === "number" &&
                !Number.isNaN(row.timeTaken) &&
                row.timeTaken > 0
        )
        .sort(sortCompetitionByTime)
        .map((row, index) => ({
            rank: index + 1,
            id: row.userId ? String(row.userId) : null,
            participantId: row.registrationId
                ? String(row.registrationId)
                : null,
            name: row.participantName || "",
            krsaId: row.krsaId || "",
            timeTaken: row.timeTaken,
        }));

const buildCategoryResultBlock = async (
    participant,
    eventId,
    categoryLabel,
    registeredCategory
) => {
    const ageGroup = participant.ageGroup || "";

    const { results: categoryResults } =
        await listCompetitionCategoryRankingsRepository(eventId, {
            ageGroup,
            categoryName: categoryLabel,
            categoriesId: participant.categoriesId,
        });

    const skaters = mapCategoryLeaderboard(categoryResults);

    return {
        eventNo: null,
        name: categoryLabel,
        timeTaken: registeredCategory.timeTaken ?? null,
        rank: registeredCategory.rank ?? null,
        isDisqualified: Boolean(registeredCategory.isDisqualified),
        remarks: registeredCategory.remarks || "",
        attendanceStatus: registeredCategory.attendanceStatus || "pending",
        totalParticipants: categoryResults.length,
        totalWithTime: skaters.length,
        topThree: buildSkaterPodiumTopThree(categoryResults),
        skaters,
    };
};

const get_skater_results_by_event_repositories = async (
    userId,
    eventId,
    categoryName
) => {
    const categoryLabel = String(categoryName || "").trim();

    if (!mongoose.Types.ObjectId.isValid(String(eventId))) {
        throw new AppError("Invalid event id", 400);
    }

    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    const participant = await EventParticipant.findOne({
        userId,
        eventId,
        paymentStatus: "paid",
    })
        .populate({
            path: "eventId",
            select:
                "header eventType eventStartDate eventEndDate eventStartTime eventEndTime address status colorOne colorTwo textColor",
        })
        .populate("categoriesId", "_id typeName")
        .lean();

    if (!participant) {
        throw new AppError("You are not registered for this event", 404);
    }

    const event = participant.eventId;
    if (!event?._id) {
        throw new AppError("Event not found", 404);
    }

    const eventEnd = event.eventEndDate ? new Date(event.eventEndDate) : null;
    if (!eventEnd || Number.isNaN(eventEnd.getTime()) || eventEnd > twoDaysAgo) {
        throw new AppError("Results are not available yet for this event", 400);
    }

    const skatingCategory = participant.categoriesId;
    const categoryRefId =
        skatingCategory?._id ?? participant.categoriesId ?? null;
    const ageGroup = participant.ageGroup || "";

    const eventBase = {
        eventId: event._id,
        eventName: event.header || "",
        eventType: event.eventType || "",
        eventStartDate: event.eventStartDate || null,
        eventEndDate: event.eventEndDate || null,
        ageGroup,
        categoriesId: categoryRefId
            ? {
                  _id: categoryRefId,
                  name: skatingCategory?.typeName ?? "",
              }
            : null,
    };

    if (categoryLabel) {
        const registeredCategory = (participant.categories || []).find(
            (row) => String(row?.name || "").trim() === categoryLabel
        );
        if (!registeredCategory) {
            throw new AppError(
                "Category not found in your event registration",
                404
            );
        }

        const block = await buildCategoryResultBlock(
            participant,
            eventId,
            categoryLabel,
            registeredCategory
        );

        return {
            ...eventBase,
            categoryName: categoryLabel,
            totalParticipants: block.totalParticipants,
            totalWithTime: block.totalWithTime,
            myResult: {
                timeTaken: block.timeTaken,
                rank: block.rank,
                isDisqualified: block.isDisqualified,
                attendanceStatus: block.attendanceStatus,
            },
            topThree: block.topThree,
            skaters: block.skaters,
        };
    }

    const registeredCategories = (participant.categories || [])
        .map((row, index) => ({
            index,
            name: String(row?.name || "").trim(),
            row,
        }))
        .filter((entry) => entry.name);

    if (registeredCategories.length === 0) {
        throw new AppError("No categories found in your event registration", 404);
    }

    const categories = [];
    for (const entry of registeredCategories) {
        const block = await buildCategoryResultBlock(
            participant,
            eventId,
            entry.name,
            entry.row
        );
        categories.push({
            ...block,
            eventNo: entry.index + 1,
        });
    }

    return {
        ...eventBase,
        categories,
    };
};


export {
    after_login_skater_form_repositories,
    get_skater_profile_repositories,
    get_skater_digital_id_card_repositories,
    update_skater_profile_repositories,
    delete_skater_repositories,
    get_all_skating_event_categories_repositories,
    get_all_skating_event_categories_full_repositories,
    get_all_discipline_repositories,
    get_skater_results_event_repositories,
    get_skater_results_by_event_repositories,
}