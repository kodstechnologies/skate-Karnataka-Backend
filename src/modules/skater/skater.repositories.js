import mongoose from "mongoose";
import { AppError } from "../../util/common/AppError.js";
import { BaseAuth } from "../auth/baseAuth.model.js";
import { DisciplineService } from "../discipline/discipline.model.js";
import { Discipline } from "../guest/disciplines.model.js";
import {
  countSkaterParticipantMedalStatsRepository,
  listCompetitionCategoryRankingsRepository,
} from "../event/event.repositories.js";
import { sortCompetitionByTime } from "../../util/competition/rankUtil.js";
import { formatCompetitionTimeTakenFromSeconds } from "../../util/time/timeUtil.js";
import { EventParticipant } from "../event/eventParticipant.model.js";
import { GeneratedCertificate } from "../certificate/generatedCertificate.model.js";
import SkatingEventCategory from "../event/SkatingEventCategory.model.js";
import { Skater } from "./skater.model.js";
import { Club } from "../club/club.model.js";
import { paginate, calcTotalPages } from "../../util/common/paginate.js";
import { notifyClubMembersOnSkaterJoin } from "../../util/firebase/sendNotification.js";

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

const normalizeObjectIdString = (value) => {
    if (value == null || value === "") return "";
    return String(value);
};

const after_login_skater_form_repositories = async (data, id) => {
    const existingUser = await BaseAuth.findById(id)
        .select("_id role phone email verify")
        .lean();

    const existingSkater = await Skater.findById(id)
        .select("club clubStatus fullName verify")
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

    const previousClubId = normalizeObjectIdString(existingSkater?.club);
    const newClubId = data?.club ? normalizeObjectIdString(data.club) : "";
    const previousClubStatus = String(existingSkater?.clubStatus || "")
        .trim()
        .toLowerCase();
    const wasAlreadyVerified = Boolean(existingUser?.verify ?? existingSkater?.verify);

    if (data?.club) {
        setPayload.clubStatus = "join";
    } else {
        setPayload.clubStatus = "apply";
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
        returnDocument: "after",
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

    const alreadyJoinedSameClub =
        Boolean(newClubId) &&
        previousClubId === newClubId &&
        previousClubStatus === "join";

    const shouldNotifyClubJoin =
        Boolean(newClubId) &&
        setPayload.clubStatus === "join" &&
        (!wasAlreadyVerified || !alreadyJoinedSameClub);
console.log("🚀 ~ after_login_skater_form_repositories ~ shouldNotifyClubJoin:", shouldNotifyClubJoin, { wasAlreadyVerified, alreadyJoinedSameClub, previousClubId, newClubId, previousClubStatus: previousClubStatus || "none" })

    if (shouldNotifyClubJoin) {
        const clubExists = await Club.exists({ _id: newClubId });
        if (clubExists) {
            notifyClubMembersOnSkaterJoin({
                clubDocId: newClubId,
                skaterId: id,
                skaterName: profile?.fullName || existingSkater?.fullName || "",
            }).catch((err) => {
                console.error(
                    "Skater after-login club join notification failed:",
                    err?.message || err
                );
            });
        }
    }

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

    if (!profile) return null;

    const withDiscipline = await attachDisciplineName(profile);
    const medalStats = await countSkaterParticipantMedalStatsRepository(id);

    return {
        ...withDiscipline,
        goldMedals: medalStats.goldMedals,
        silverMedals: medalStats.silverMedals,
    };
};

const formatSkaterFullDetailsDto = (skater, disciplineName, medalStats = {}) => ({
    id: skater._id,
    fullName: skater.fullName || "",
    phone: skater.phone || "",
    countryCode: skater.countryCode || "+91",
    email: skater.email || "",
    gender: skater.gender || "",
    address: skater.address || "",
    photo: skater.photo || "",
    profile: skater.profile || skater.photo || "",
    krsaId: skater.krsaId || "",
    dob: skater.dob || null,
    rsfiId: skater.rsfiId || "",
    aadharNumber: skater.aadharNumber || "",
    discipline: disciplineName || skater.discipline?.name || skater.discipline?.title || "",
    disciplineId: skater.discipline?._id || skater.discipline || null,
    parent: skater.parent || "",
    bloodGroup: skater.bloodGroup || "",
    school: skater.school || "",
    grade: skater.grade || "",
    signature: skater.signature || "",
    clubStatus: skater.clubStatus || "",
    verify: Boolean(skater.verify),
    category: skater.category
        ? {
              _id: skater.category._id,
              typeName: skater.category.typeName || "",
          }
        : null,
    club: skater.club
        ? {
              _id: skater.club._id,
              name: skater.club.name || "",
              clubId: skater.club.clubId || "",
              img: skater.club.img || "",
              districtName: skater.club.districtName || "",
              officeAddress: skater.club.officeAddress || "",
          }
        : null,
    district: skater.district
        ? {
              _id: skater.district._id,
              name: skater.district.name || "",
          }
        : null,
    applyClub: (skater.applyClub || []).map((item) => ({
        _id: item?._id,
        name: item?.name || "",
        clubId: item?.clubId || "",
        img: item?.img || "",
    })),
    documents: skater.documents || [],
    goldMedals: medalStats.goldMedals ?? 0,
    silverMedals: medalStats.silverMedals ?? 0,
    createdAt: skater.createdAt,
    updatedAt: skater.updatedAt,
});

const get_skater_digital_id_card_repositories = async (id) => {
    const profile = await Skater.findById(id)
        .select("-refreshTokens -firebaseTokens")
        .populate("club", "name clubId img districtName officeAddress")
        .populate("category", "typeName")
        .populate("discipline", "name title")
        .populate("district", "name")
        .populate("applyClub", "name clubId img")
        .lean();

    if (!profile) {
        return null;
    }

    const disciplineName = await resolveDisciplineName(profile.discipline);
    const medalStats = await countSkaterParticipantMedalStatsRepository(id);

    return formatSkaterFullDetailsDto(profile, disciplineName, medalStats);
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

const withTimeDisplay = (seconds) => {
    if (seconds === null || seconds === undefined) {
        return { timeTaken: null, timeDisplay: null };
    }
    if (typeof seconds !== "number" || Number.isNaN(seconds)) {
        return { timeTaken: null, timeDisplay: null };
    }
    return {
        timeTaken: seconds,
        timeDisplay: formatCompetitionTimeTakenFromSeconds(seconds),
    };
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
            ...withTimeDisplay(row.timeTaken ?? null),
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

const normalizeAgeGroupKey = (value) => String(value || "").trim().toLowerCase();

const buildEventAgeGroupKey = (eventId, ageGroup) =>
    `${String(eventId)}:${normalizeAgeGroupKey(ageGroup)}`;

/** Results visible after event end datetime + 2 calendar days. */
const isEventResultsUnlocked = (event, now = new Date()) => {
    const endDateTime = parseEventEndDateTime(
        event?.eventEndDate,
        event?.eventEndTime
    );
    if (!endDateTime) return false;

    const unlockAt = new Date(endDateTime);
    unlockAt.setDate(unlockAt.getDate() + 2);
    return now > unlockAt;
};

const loadCertifiedEventAgeGroupKeys = async (eventIds) => {
    if (!eventIds.length) return new Set();

    const certificates = await GeneratedCertificate.find({
        eventId: { $in: eventIds },
    })
        .select("eventId ageGroup")
        .lean();

    return new Set(
        certificates.map((row) =>
            buildEventAgeGroupKey(row.eventId, row.ageGroup)
        )
    );
};

const hasGeneratedCertificateForEventAgeGroup = async (eventId, ageGroup) => {
    const normalized = normalizeAgeGroupKey(ageGroup);
    if (!normalized) return false;

    const certificates = await GeneratedCertificate.find({ eventId })
        .select("ageGroup")
        .lean();

    return certificates.some(
        (row) => normalizeAgeGroupKey(row.ageGroup) === normalized
    );
};

const emptySkaterResultsEventPage = (page, limit) => ({
    data: [],
    pagination: {
        total: 0,
        page: Math.max(Number(page), 1),
        limit: Math.max(Number(limit), 1),
        totalPages: 0,
    },
});

const get_skater_results_event_repositories = async (userId, page, limit) => {
    const { skip, limit: perPage, page: currentPage } = paginate(page, limit);

    if (!mongoose.Types.ObjectId.isValid(String(userId))) {
        return emptySkaterResultsEventPage(currentPage, perPage);
    }

    const skaterUserId = new mongoose.Types.ObjectId(String(userId));
    const now = new Date();

    const participants = await EventParticipant.find({
        userId: skaterUserId,
        eventId: { $exists: true, $ne: null },
    })
        .populate({
            path: "eventId",
            select:
                "header eventType eventStartDate eventEndDate eventStartTime eventEndTime address status colorOne colorTwo textColor",
        })
        .select("userId eventId ageGroup categories paymentStatus createdAt")
        .sort({ createdAt: -1 })
        .lean();

    const seenEventIds = new Set();
    const candidates = [];

    for (const participant of participants) {
        const rowUserId = participant.userId?._id ?? participant.userId;
        if (!rowUserId || String(rowUserId) !== String(skaterUserId)) {
            continue;
        }

        const event = participant.eventId;
        if (!event?._id) continue;

        const eventIdStr = String(event._id);
        if (seenEventIds.has(eventIdStr)) continue;
        seenEventIds.add(eventIdStr);

        if (participant.paymentStatus !== "paid") continue;
        if (!isEventResultsUnlocked(event, now)) continue;

        const endDateTime = parseEventEndDateTime(
            event.eventEndDate,
            event.eventEndTime
        );
        const eventEnded = Boolean(endDateTime && now > endDateTime);

        candidates.push({
            participant,
            event,
            eventEnded,
        });
    }

    const certifiedKeys = await loadCertifiedEventAgeGroupKeys(
        candidates.map((row) => row.event._id)
    );

    const events = candidates
        .filter((row) =>
            certifiedKeys.has(
                buildEventAgeGroupKey(row.event._id, row.participant.ageGroup)
            )
        )
        .map(({ participant, event, eventEnded }) => ({
            participantId: participant._id,
            isRegistered: true,
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
            resultsAvailable: true,
            categories: (participant.categories || [])
                .map((row, index) => ({
                    eventNo: index + 1,
                    name: String(row?.name || "").trim(),
                }))
                .filter((row) => row.name),
        }));

    const sorted = events.sort((a, b) => {
        const aEnd = a.eventEndDate ? new Date(a.eventEndDate).getTime() : 0;
        const bEnd = b.eventEndDate ? new Date(b.eventEndDate).getTime() : 0;
        return bEnd - aEnd;
    });

    const total = sorted.length;
    const data = sorted.slice(skip, skip + perPage);

    return {
        data,
        pagination: {
            total,
            page: currentPage,
            limit: perPage,
            totalPages: calcTotalPages(total, perPage),
        },
    };
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
            ...withTimeDisplay(row.timeTaken),
        }));

const buildMyResultFromCategory = (registeredCategory = null) => ({
    ...withTimeDisplay(registeredCategory?.timeTaken ?? null),
    rank: registeredCategory?.rank ?? null,
    isDisqualified: Boolean(registeredCategory?.isDisqualified),
    attendanceStatus: registeredCategory?.attendanceStatus || "pending",
});

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
        ...withTimeDisplay(registeredCategory.timeTaken ?? null),
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

    const now = new Date();

    const skaterUserId = mongoose.Types.ObjectId.isValid(String(userId))
        ? new mongoose.Types.ObjectId(String(userId))
        : null;
    if (!skaterUserId) {
        throw new AppError("You are not registered for this event", 404);
    }

    const participant = await EventParticipant.findOne({
        userId: skaterUserId,
        eventId,
    })
        .populate({
            path: "eventId",
            select:
                "header eventType eventStartDate eventEndDate eventStartTime eventEndTime address status colorOne colorTwo textColor",
        })
        .populate("categoriesId", "_id typeName")
        .lean();

    if (!participant) {
        return {
            eventId,
            resultsAvailable: false,
            categoryName: categoryLabel || null,
            totalParticipants: 0,
            totalWithTime: 0,
            myResult: buildMyResultFromCategory(),
            topThree: [],
            skaters: [],
            categories: [],
        };
    }

    const event = participant.eventId;
    if (!event?._id) {
        return {
            eventId,
            resultsAvailable: false,
            categoryName: categoryLabel || null,
            totalParticipants: 0,
            totalWithTime: 0,
            myResult: buildMyResultFromCategory(),
            topThree: [],
            skaters: [],
            categories: [],
        };
    }

    const ageGroup = participant.ageGroup || "";

    const resultsAvailable =
        participant.paymentStatus === "paid" &&
        isEventResultsUnlocked(event, now) &&
        (await hasGeneratedCertificateForEventAgeGroup(event._id, ageGroup));

    const skatingCategory = participant.categoriesId;
    const categoryRefId =
        skatingCategory?._id ?? participant.categoriesId ?? null;

    const eventBase = {
        eventId: event._id,
        eventName: event.header || "",
        eventType: event.eventType || "",
        eventStartDate: event.eventStartDate || null,
        eventEndDate: event.eventEndDate || null,
        colorOne: event.colorOne ?? "#6A11CB",
        colorTwo: event.colorTwo ?? "#2575FC",
        textColor: event.textColor ?? "#FFFFFF",
        ageGroup,
        resultsAvailable,
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

        if (!resultsAvailable || !registeredCategory) {
            return {
                ...eventBase,
                categoryName: categoryLabel,
                totalParticipants: 0,
                totalWithTime: 0,
                myResult: buildMyResultFromCategory(registeredCategory),
                topThree: [],
                skaters: [],
            };
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
                ...withTimeDisplay(block.timeTaken),
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

    if (!resultsAvailable || registeredCategories.length === 0) {
        return {
            ...eventBase,
            categories: [],
        };
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