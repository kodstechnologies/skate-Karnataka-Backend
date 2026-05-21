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

const assertDisciplineExists = async (disciplineId) => {
    if (!disciplineId) return;

    const record = await findDisciplineById(disciplineId);
    if (!record) {
        throw new AppError("Discipline not found", 404);
    }
};

const after_login_skater_form_repositories = async (data, id) => {
    const existingUser = await BaseAuth.findOne({
        _id: id,
        role: { $in: SKATER_ROLES },
    })
        .select("_id role phone email")
        .lean();

    if (!existingUser) {
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

    await assertUniqueContactForUpdate(id, setPayload, existingUser);

    if (data?.club) {
        setPayload.clubStatus = "apply";
    } else {
        setPayload.clubStatus = "join";
    }

    const updateOperation = { $set: setPayload };

    if (Array.isArray(documents) && documents.length > 0) {
        updateOperation.$push = {
            documents: { $each: documents },
        };
    }

    const updated = await BaseAuth.findByIdAndUpdate(id, updateOperation, {
        new: true,
        runValidators: true,
    });

    if (!updated) {
        throw new AppError("Skater not found", 404);
    }

    const populated = await Skater.findById(id)
        .populate("district")
        .populate("club")
        .populate("discipline", "name");
    return populated || updated;
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

const buildEventCategoriesWithTopThree = async (participant, eventId) => {
    const categories = [];

    for (const [index, category] of (participant.categories || []).entries()) {
        const name = String(category?.name || "").trim();
        if (!name) continue;

        const { results: categoryResults } =
            await listCompetitionCategoryRankingsRepository(eventId, {
                ageGroup: participant.ageGroup,
                categoryName: name,
                categoriesId: participant.categoriesId,
            });

        categories.push({
            eventNo: index + 1,
            name,
            timeTaken: category.timeTaken ?? null,
            rank: category.rank ?? null,
            isDisqualified: Boolean(category.isDisqualified),
            remarks: category.remarks || "",
            attendanceStatus: category.attendanceStatus || "pending",
            topThree: buildSkaterPodiumTopThree(categoryResults),
        });
    }

    return categories;
};

const get_skater_results_repositories = async (userId) => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    const participants = await EventParticipant.find({
        userId,
        paymentStatus: "paid",
    })
        .populate([
            {
                path: "eventId",
                select: "header eventType eventStartDate eventEndDate",
            },
            { path: "categoriesId", select: "_id typeName" },
        ])
        .sort({ createdAt: -1 })
        .lean();

    const results = [];

    for (const participant of participants) {
        const event = participant.eventId;
        if (!event?._id) continue;

        const eventEnd = event.eventEndDate ? new Date(event.eventEndDate) : null;
        if (!eventEnd || Number.isNaN(eventEnd.getTime()) || eventEnd > twoDaysAgo) {
            continue;
        }

        const categories = await buildEventCategoriesWithTopThree(
            participant,
            event._id
        );
        if (categories.length === 0) continue;

        const skatingCategory = participant.categoriesId;
        const categoryRefId =
            skatingCategory?._id ?? participant.categoriesId ?? null;

        results.push({
            eventId: event._id,
            eventName: event.header || "",
            eventType: event.eventType || "",
            eventStartDate: event.eventStartDate || null,
            eventEndDate: event.eventEndDate || null,
            ageGroup: participant.ageGroup || "",
            categoriesId: categoryRefId
                ? {
                      _id: categoryRefId,
                      name: skatingCategory?.typeName ?? "",
                  }
                : null,
            categories,
        });
    }

    return results.sort((a, b) => {
        const aEnd = a.eventEndDate ? new Date(a.eventEndDate).getTime() : 0;
        const bEnd = b.eventEndDate ? new Date(b.eventEndDate).getTime() : 0;
        return bEnd - aEnd;
    });
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
    get_skater_results_repositories,
}