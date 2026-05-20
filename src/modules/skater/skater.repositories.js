import { AppError } from "../../util/common/AppError.js";
import { BaseAuth } from "../auth/baseAuth.model.js";
import { DisciplineService } from "../discipline/discipline.model.js";
import { Event } from "../event/event.model.js";
import { EventParticipant } from "../event/eventParticipant.model.js";
import { resolveSkaterEventScope } from "../event/event.repositories.js";
import SkatingEventCategory from "../event/SkatingEventCategory.model.js";
import { Skater } from "./skater.model.js";

const normalizePhone = (value) => String(value ?? "").trim();

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

    const populated = await Skater.findById(id).populate("district").populate("club");
    return populated || updated;
};

const get_skater_profile_repositories = async (id) => {
    const profile = await Skater.findById(id).select("photo fullName krsaId discipline").lean();
    console.log(profile, "profile ...");
    return profile;
};

const get_skater_digital_id_card_repositories = async (id) => {
    const profile = await Skater.findById(id)
        .select("createdAt photo fullName krsaId dob category club")
        .populate("club", "name")
        .populate("category", "typeName")
        .lean();
    console.log(profile, "profile ...");
    return profile;
}

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
    return await DisciplineService.find({})
        .sort({ createdAt: -1 })
        .lean();
}

const get_skater_results_repositories = async (userId) => {
    const scope = await resolveSkaterEventScope(userId);
    if (!scope) {
        throw new AppError("Skater not found", 404);
    }

    const eventScope = [{ eventType: "State" }];
    if (scope.clubId) {
        eventScope.push({ eventType: "Club", eventFor: scope.clubId });
    }
    if (scope.districtId) {
        eventScope.push({ eventType: "District", eventFor: scope.districtId });
    }

    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    const events = await Event.find({
        $or: eventScope,
        eventEndDate: { $lte: twoDaysAgo },
    })
        .select("_id header eventType eventStartDate eventEndDate")
        .sort({ eventEndDate: -1 })
        .lean();

    if (events.length === 0) {
        return [];
    }

    const eventIds = events.map((event) => event._id);
    const participants = await EventParticipant.find({
        userId,
        eventId: { $in: eventIds },
        paymentStatus: "paid",
    })
        .select("eventId ageGroup categories")
        .lean();

    const eventById = new Map(events.map((event) => [String(event._id), event]));
    const groupedByCategory = new Map();

    for (const participant of participants) {
        const event = eventById.get(String(participant.eventId));
        if (!event) continue;

        for (const category of participant.categories || []) {
            const categoryName = String(category?.name || "").trim();
            if (!categoryName) continue;

            if (!groupedByCategory.has(categoryName)) {
                groupedByCategory.set(categoryName, []);
            }

            groupedByCategory.get(categoryName).push({
                eventId: event._id,
                eventName: event.header || "",
                eventType: event.eventType || "",
                eventStartDate: event.eventStartDate || null,
                eventEndDate: event.eventEndDate || null,
                ageGroup: participant.ageGroup || "",
                timeTaken: category.timeTaken ?? null,
                rank: category.rank ?? null,
                isDisqualified: Boolean(category.isDisqualified),
                remarks: category.remarks || "",
                attendanceStatus: category.attendanceStatus || "pending",
            });
        }
    }

    return Array.from(groupedByCategory.entries())
        .map(([categoryName, results]) => ({
            categoryName,
            totalResults: results.length,
            results: results.sort((a, b) => {
                const aEnd = a.eventEndDate ? new Date(a.eventEndDate).getTime() : 0;
                const bEnd = b.eventEndDate ? new Date(b.eventEndDate).getTime() : 0;
                return bEnd - aEnd;
            }),
        }))
        .sort((a, b) => a.categoryName.localeCompare(b.categoryName));
}


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