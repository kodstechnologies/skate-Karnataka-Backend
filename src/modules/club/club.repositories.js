import { paginate } from "../../util/common/paginate.js";
import { AppError } from "../../util/common/AppError.js";
// import { Skater } from "../auth/skater.model.js";
import { District } from "../district/district.model.js";
import { Skater } from "../skater/skater.model.js";
import { Event } from "../event/event.model.js";
import { EventParticipant } from "../event/eventParticipant.model.js";
import { Club } from "./club.model.js";
import { BaseAuth } from "../auth/baseAuth.model.js";

const hasDistrictRef = (district) =>
    district != null && String(district).trim() !== "";

export const displayClubDashboardRepositories = async ({ clubId }) => {
    // Support both Club document id and BaseAuth id from auth token.
    const club = await Club.findOne({
        $or: [{ _id: clubId }, { members: clubId }],
    })
        .select("name img championships rank")
        .lean();

    if (!club) {
        throw new AppError("Club not found", 404);
    }

    const skaterFilter = {
        club: club._id,
        clubStatus: { $in: ["join", "apply-leave"] },
        role: "Skater",
    };

    const totalSkaters = await Skater.countDocuments(skaterFilter);

    const latestSkatersRaw = await Skater.find(skaterFilter)
        .select("fullName photo profile krsaId createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

    const latestSkaters = latestSkatersRaw.map((skater) => ({
        name: skater.fullName || "",
        profile: skater.photo || skater.profile || "",
        krsaId: skater.krsaId || "",
    }));

    return {
        clubName: club?.name || null,
        clubImage: club?.img || null,
        championships: club?.championships || 0,
        rank: club?.rank || 0,
        totalSkaters,
        latestSkaters,
    };
};


export const displayClubProfileRepositories = async (userId) => {
    const club = await Club.findOne({ members: userId })
        .select("name img address district districtName districtStatus about rank championships clubId members")
        .populate("district", "name")
        .populate("members", "_id fullName phone email role krsaId profile gender address")
        .lean();

    if (!club) return null;

    // const totalSkater = await Skater.countDocuments({
    //     club: clubId,
    //     clubStatus: "join",
    //     role: "Skater",
    // });

    const normalizedMembers = (club.members || []).map((member) => ({
        _id: member?._id,
        fullName: member?.fullName || "",
        phone: member?.phone || "",
        email: member?.email || "",
        role: member?.role || "",
        krsaId: member?.krsaId || "",
        photo: member?.profile || "",
        gender: member?.gender || "",
        address: member?.address || "",
    }));

    const currentMember =
        normalizedMembers.find((member) => String(member._id) === String(userId)) || null;

    return {
        id: String(club._id),
        name: club.name || "",
        image: club.img || "",
        address: club.officeAddress || "",
        districtId: hasDistrictRef(club.district) ? String(club.district) : "",
        districtName: club.district?.name || club.districtName || "",
        districtStatus: club.districtStatus || "",
        about: club.about || "",
        rank: club.rank ?? 0,
        championships: club.championships ?? 0,
        clubId: club.clubId || "",
        currentMember,
        totalMembers: normalizedMembers.length,
    };
};
export const affiliatedDistrictRepository = async (clubMemberId) => {
    const club = await Club.findOne({
        $or: [{ _id: clubMemberId }, { members: clubMemberId }],
    })
        .select("district districtName districtStatus")
        .lean();

    if (!club) {
        throw new AppError("Club not found for this token", 404);
    }

    if (!hasDistrictRef(club.district)) {
        return null;
    }

    const district = await District.findById(club.district)
        .select("name officeAddress img about rank championships members")
        .lean();

    if (!district) {
        return null;
    }

    const districtAuthOr = [
        { district: club.district, role: "District" },
    ];
    if ((district.members || []).length > 0) {
        districtAuthOr.push({
            _id: { $in: district.members },
            role: "District",
        });
    }

    const [totalClubs, districtAuth] = await Promise.all([
        Club.countDocuments({ district: club.district }),
        BaseAuth.findOne({ $or: districtAuthOr }).select("krsaId").lean(),
    ]);

    return {
        districtId: district._id,
        krsaId: districtAuth?.krsaId || "",
        districtName: district.name || club.districtName || "",
        address: district.officeAddress || "",
        img: district.img || "",
        about: district.about || "",
        rank: district.rank ?? 0,
        championships: district.championships ?? 0,
        totalClubs,
        districtStatus: club.districtStatus || "",
    };
};

export const exceptOwnDistrictDisplayAllDistrictRepository = async (
    id,
    { page = 1, limit = 10, search = "" } = {}
) => {
    // Accept either Club document _id or authenticated BaseAuth _id.
    const club = await Club.findOne({
        $or: [{ _id: id }, { members: id }],
    })
        .select("district")
        .lean();

    if (!club) {
        return null;
    }

    const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);

    const filter = hasDistrictRef(club.district)
        ? { _id: { $ne: club.district } }
        : {};

    const term = String(search || "").trim();
    if (term) {
        filter.name = { $regex: term, $options: "i" };
    }

    const [districts, total] = await Promise.all([
        District.find(filter)
            .select("_id name img")
            .sort({ name: 1 })
            .skip(skip)
            .limit(pageLimit)
            .lean(),
        District.countDocuments(filter),
    ]);

    return {
        data: districts,
        pagination: {
            total,
            page: currentPage,
            limit: pageLimit,
            totalPages: Math.ceil(total / pageLimit) || 0,
        },
    };
};

export const displayDistrictFullDetailsRepository = async (districtId) => {
    const district = await District.findById(districtId)
        .select("name img about presidentName")
        .lean();

    if (!district) {
        return null;
    }

    const [clubsCount, totalSkaters, events] = await Promise.all([
        Club.countDocuments({ district: districtId }),
        Skater.countDocuments({ district: districtId, role: "Skater" }),
        Event.countDocuments({ eventType: "District", eventFor: districtId }),
    ]);

    return {
        name: district.name || "",
        img: district.img || "",
        about: district.about || "",
        presidentName: district.presidentName || "",
        clubsCount,
        totalSkaters,
        events,
    };
};

export const applyForDistrictRepository = async (
    memberOrClubId,
    districtId
) => {
    const district = await District.findById(districtId)
        .select("_id name")
        .lean();

    if (!district) {
        throw new AppError("District not found", 404);
    }

    const club = await Club.findOne({
        $or: [{ _id: memberOrClubId }, { members: memberOrClubId }],
    })
        .select("_id district districtName districtStatus applyDistrict")
        .lean();

    if (!club) {
        throw new AppError("Club or club membership not found", 404);
    }

    const requestedDistrictId = String(district._id);
    const existingDistrictId = hasDistrictRef(club.district)
        ? String(club.district)
        : null;

    const alreadyInApplyList = (club.applyDistrict || []).some(
        (id) => String(id) === requestedDistrictId
    );

    if (
        existingDistrictId === requestedDistrictId ||
        alreadyInApplyList
    ) {
        return {
            alreadyApplied: true,
            message: "Already applied",
            clubId: club._id,
            districtId: district._id,
            districtName: district.name || club.districtName || "",
            districtStatus: club.districtStatus || "",
        };
    }

    if (existingDistrictId && club.districtStatus === "join") {
        throw new AppError("Already affiliated with a district", 400);
    }

    const updatedClub = await Club.findByIdAndUpdate(
        club._id,
        {
            $addToSet: {
                applyDistrict: district._id,
            },
            $set: {
                districtStatus: "apply",
            },
        },
        { new: true }
    )
        .select("_id districtStatus applyDistrict")
        .lean();

    return {
        alreadyApplied: false,
        message: "District application submitted successfully",
        clubId: updatedClub._id,
        districtId: district._id,
        districtName: district.name || "",
        appliedDistrictCount: updatedClub.applyDistrict?.length ?? 0,
        districtStatus: updatedClub.districtStatus,
    };
};

export const removeAffiliationRepository = async (clubMemberId) => {
    const club = await Club.findOne({
        $or: [{ _id: clubMemberId }, { members: clubMemberId }],
    })
        .select("district districtName districtStatus")
        .lean();

    if (!club) {
        return null;
    }

    if (!hasDistrictRef(club.district)) {
        throw new AppError("No district affiliation found", 400);
    }

    if (club.districtStatus !== "join") {
        throw new AppError("Only joined clubs can request affiliation removal", 400);
    }

    const districtDoc = await District.findById(club.district).select("name").lean();
    const districtName = districtDoc?.name || club.districtName || "";

    const updated = await Club.findByIdAndUpdate(
        club._id,
        {
            $set: {
                districtStatus: "apply-leave",
                district: club.district,
                districtName,
            },
        },
        { new: true }
    )
        .select("_id district districtName districtStatus")
        .lean();

    return {
        clubId: updated._id,
        districtId: String(updated.district || club.district),
        districtName: updated.districtName || districtName,
        districtStatus: updated.districtStatus,
    };
};

// const allClubsRepository = async (id, page, limit) => {
//     console.log(id,"id=====");
//     const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);

//     const district = await District.findOne({
//         $or: [{ _id: id }, { members: id }],
//     })
//         .select("_id name")
//         .lean();

//     if (!district) {
//         throw new AppError("District not found", 404);
//     }

//     const [data, total] = await Promise.all([
//         Club.find({ district: district._id })
//             .select("_id name img address districtStatus")
//             .skip(skip)
//             .limit(pageLimit)
//             .sort({ createdAt: -1 })
//             .lean(),

//         Club.countDocuments({ district: district._id }),
//     ]);

//     const formattedData = data.map((club) => ({
//         id: String(club._id),
//         name: club.name,
//         img: club.img || "",
//         address: club.address || "",
//         districtStatus: club.districtStatus || "",
//     }));

//     return {
//         districtName: district.name || "",
//         data: formattedData,
//         meta: {
//             total,
//             page: currentPage,
//             limit: pageLimit,
//             totalPages: Math.ceil(total / pageLimit)
//         }
//     };
// };

const allClubsRepository = async (id) => {

    const district = await District.findOne({
        $or: [
            { _id: id },
            { members: id }
        ]
    })
    .select("_id name createdAt updatedAt __v")
    .lean();

    if (!district) {
        throw new AppError(
            "District not found",
            404
        );
    }

    const clubs = await Club.find({
        district: district._id
    })
    .select("_id name")
    .sort({ createdAt: -1 })
    .lean();

    return {
        _id: String(district._id),
        name: district.name || "",

        // keep same old key for flutter
        club: clubs.map((item)=>({
            _id: String(item._id),
            name: item.name || ""
        })),

        createdAt: district.createdAt,
        updatedAt: district.updatedAt,
        __v: district.__v || 0
    };
};
const allClubsInDbRepository = async ({ page, limit, search }) => {
    const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);
    const normalizedSearch = String(search || "").trim();

    const query = {};
    if (normalizedSearch) {
        const regex = new RegExp(normalizedSearch, "i");
        query.$or = [
            { name: regex },
            { districtName: regex },
            { krsaId: regex },
        ];
    }

    const [clubs, total] = await Promise.all([
        Club.find(query)
            .select("_id name districtName img krsaId clubId")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageLimit)
            .lean(),
        Club.countDocuments(query),
    ]);

    const clubIds = clubs.map((club) => club._id);
    const skaterCounts = clubIds.length
        ? await Skater.aggregate([
            {
                $match: {
                    role: "Skater",
                    club: { $in: clubIds },
                },
            },
            {
                $group: {
                    _id: "$club",
                    totalSkaters: { $sum: 1 },
                },
            },
        ])
        : [];

    const skaterCountMap = new Map(
        skaterCounts.map((item) => [String(item._id), item.totalSkaters || 0])
    );

    const data = clubs.map((club) => ({
        id: String(club._id),
        name: club.name || "",
        clubId: club.clubId || "",
        districtName: club.districtName || "",
        img: club.img || "",
        krsaId: club.krsaId || "",
        totalSkaters: skaterCountMap.get(String(club._id)) || 0,
    }));

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
const isExistClub = async (name, district) => {
    return await Club.findOne({ name, district });
}

const createClubRepository = async (data) => {
    console.log(data, "====---");

    const {
        district,
        name,
        img,
        address,
        about,
        skaters,
        rank,
        championships,
    } = data;

    // ✅ validate district
    const districtData = await District.findById(district).select("name");

    if (!districtData) {
        throw new AppError("District not found", 404);
    }

    const districtName = districtData.name;

    // ✅ create club
    const club = await Club.create({
        district,
        districtName,
        name,
        img,
        address,
        about,
        skaters,
        rank,
        championships,
   
    });

    console.log(club, "===/////");

    return club; // ✅ VERY IMPORTANT
};

const clubIdStoreinDestrict = async (districtId, clubId) => {
    await District.findByIdAndUpdate(
        districtId,
        {
            $push: { club: clubId }
        }, {
        new: true
    }
    );
}

const isThisClubExist = async (id) => {
    return await Club.findById(id);
}

const displayFullDetailsOfClub = async (id) => {
    return await Club.findById(id);
}

const updateClubDetails = async (data, id) => {
    const updatedClub = await Club.findByIdAndUpdate(
        id,
        { $set: data },
        { returnDocument: "after", runValidators: true }
    );

    if (!updatedClub) {
        throw new AppError("Club not found", 404);
    }
}

const deleteClubDetails = async (id) => {
    await Club.findByIdAndDelete(id);
}

const clubsByDistrictPaginatedRepository = async (
    districtId,
    { page, limit, excludeClubId = null }
) => {
    const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);

    const filter = { district: districtId };
    if (excludeClubId) {
        filter._id = { $ne: excludeClubId };
    }

    const clubs = await Club.find(filter)
        .select("_id name img address districtStatus districtName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit)
        .lean();

    const total = await Club.countDocuments(filter);

    return {
        total,
        page: currentPage,
        limit: pageLimit,
        totalPages: Math.ceil(total / pageLimit) || 0,
        data: clubs,
    };
};

const SKATER_IN_CLUB_STATUSES = ["join", "apply-leave"];

const allClubsPaginatedForSkaterRepository = async ({ page, limit }) => {
    const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);

    const [clubs, total] = await Promise.all([
        Club.find({})
            .select("_id name img address districtStatus districtName")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageLimit)
            .lean(),
        Club.countDocuments({}),
    ]);

    return {
        total,
        page: currentPage,
        limit: pageLimit,
        totalPages: Math.ceil(total / pageLimit) || 0,
        data: clubs,
        scope: "all",
    };
};

/**
 * Joined skater: other clubs in the same district (current club excluded).
 * No club / left club: all clubs paginated.
 */
const clubsForSkaterUserRepository = async (userId, { page, limit }) => {
    const skater = await Skater.findById(userId).select("club clubStatus").lean();

    if (!skater) {
        throw new AppError("Skater not found", 404);
    }

    const status = String(skater.clubStatus || "").trim().toLowerCase();
    const inClub =
        skater.club &&
        SKATER_IN_CLUB_STATUSES.includes(status);

    if (inClub) {
        const clubDoc = await Club.findById(skater.club).select("district districtName").lean();
        if (!clubDoc?.district) {
            throw new AppError("Joined club has no district assigned", 400);
        }

        const result = await clubsByDistrictPaginatedRepository(clubDoc.district, {
            page,
            limit,
            excludeClubId: skater.club,
        });

        return {
            ...result,
            scope: "district",
            districtId: clubDoc.district,
            districtName: clubDoc.districtName || "",
            joinedClubId: skater.club,
            excludedClubId: skater.club,
        };
    }

    return await allClubsPaginatedForSkaterRepository({ page, limit });
};

const isExistClubRepository = async (id) => {
    const skater = await Skater.findById(id).select("club");
    console.log(skater, "skater==")
    return !!skater?.club;
};


const apply_club_repositories = async (clubId, skaterId) => {
    const updatedSkater = await Skater.findByIdAndUpdate(
        skaterId,
        {
            clubStatus: "apply",
            $addToSet: { applyClub: clubId },
        },
        { new: true }
    )
    console.log(updatedSkater, "updatedSkater");
}

const isApplyRepository = async (id) => {
    const skater = await Skater.findById(id)

    return skater?.clubStatus;
}

const isAlreadyAppliedToClubRepository = async (skaterId, clubId) => {
    const club = await Club.findOne({
        $or: [{ _id: clubId }, { members: clubId }],
    })
        .select("_id")
        .lean();

    if (!club) {
        throw new AppError("Club not found", 404);
    }

    const skater = await Skater.findOne({
        _id: skaterId,
        applyClub: club._id,
    })
        .select("_id")
        .lean();

    return !!skater;
}

const approve_join_club_repositories = async (skaterId, ClubId) => {
    const club = await Club.findOne({
        $or: [{ _id: ClubId }, { members: ClubId }],
    })
        .select("_id")
        .lean();

    if (!club) {
        throw new AppError("Club not found", 404);
    }

    const updatedSkater = await Skater.findOneAndUpdate(
        {
            _id: skaterId,
            applyClub: club._id,
            clubStatus: "apply",
        },
        {
            club: club._id,
            clubStatus: "join",
            applyClub: [],
        },
        { new: true }
    );

    if (!updatedSkater) {
        throw new AppError("Skater join application not found for this club", 404);
    }

    return updatedSkater;
}

export const reject_join_club_repositories = async (skaterId, clubId) => {
    const club = await Club.findOne({
        $or: [{ _id: clubId }, { members: clubId }],
    })
        .select("_id")
        .lean();

    if (!club) {
        throw new AppError("Club not found", 404);
    }

    const skater = await Skater.findOneAndUpdate(
        {
            _id: skaterId,
            $or: [
                { applyClub: club._id },
                { club: club._id },
            ],
        },
        {
            $pull: {
                applyClub: club._id,
            },
            $set: {
                clubStatus: "leave",
                club: null,
            },
        },
        { new: true }
    );

    if (!skater) {
        throw new AppError("Join application not found for this club", 404);
    }

    return skater;
};

const resolveClubIdFromClubMember = async (clubMemberId) => {
    const club = await Club.findOne({
        $or: [{ _id: clubMemberId }, { members: clubMemberId }],
    })
        .select("_id name")
        .lean();

    if (!club) {
        throw new AppError("Club not found for this token", 404);
    }

    return club;
};

const apply_leave_repository = async (skaterId) => {
    return await Skater.findOneAndUpdate(
        { _id: skaterId, clubStatus: "join" }, // only if joined
        {
            clubStatus: "apply-leave",
        },
        { new: true }
    );
};

const approve_leave_club_repositories = async (skaterId, clubMemberId) => {
    const club = await resolveClubIdFromClubMember(clubMemberId);

    const skater = await Skater.findOneAndUpdate(
        {
            _id: skaterId,
            club: club._id,
            clubStatus: "apply-leave",
        },
        {
            clubStatus: "leave",
            club: null,
        },
        { new: true }
    ).lean();

    if (!skater) {
        throw new AppError("Skater leave request not found for this club", 404);
    }

    return skater;
};

const reject_leave_club_repositories = async (skaterId, clubMemberId) => {
    const club = await resolveClubIdFromClubMember(clubMemberId);

    const skater = await Skater.findOneAndUpdate(
        {
            _id: skaterId,
            club: club._id,
            clubStatus: "apply-leave",
        },
        { $set: { clubStatus: "join" } },
        { new: true }
    ).lean();

    if (!skater) {
        throw new AppError("Skater leave request not found for this club", 404);
    }

    return skater;
};

const reject_leave_district_affiliation_repository = async (clubMemberId) => {
    const club = await Club.findOne({
        $or: [{ _id: clubMemberId }, { members: clubMemberId }],
    })
        .select("district districtStatus districtName")
        .lean();

    if (!club) {
        throw new AppError("Club not found for this token", 404);
    }

    if (!hasDistrictRef(club.district)) {
        throw new AppError("No district affiliation found", 400);
    }

    if (club.districtStatus !== "apply-leave") {
        throw new AppError("No pending district leave request", 400);
    }

    const updated = await Club.findByIdAndUpdate(
        club._id,
        {
            $set: {
                districtStatus: "join",
                district: club.district,
                districtName: club.districtName || "",
            },
        },
        { new: true }
    )
        .select("_id district districtStatus districtName")
        .lean();

    return {
        clubId: updated._id,
        districtId: String(updated.district || club.district),
        districtName: updated.districtName || club.districtName || "",
        districtStatus: updated.districtStatus,
    };
};

const display_existing_club_repositories = async (id) => {
    console.log(id, "----")
    const r = await Skater.findById(id).select("club").populate(
        "club",
        "img name clubId districtName officeAddress about rank championships"
    );
    return r;
};

const formatApplyListItem = (type, id, fullName, sortAt, extra = {}) => ({
    type,
    id,
    fullName: fullName || "",
    sortAt,
    ...extra,
});

const display_all_apply_skater_repositories = async (
    clubMemberId,
    { page = 1, limit = 10 } = {}
) => {
    const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);
    const club = await resolveClubIdFromClubMember(clubMemberId);
    const clubOid = club._id;
    const clubIdStr = String(clubOid);
    const data = [];

    const skaters = await Skater.find({
        role: "Skater",
        $or: [
            { applyClub: clubOid },
            { club: clubOid, clubStatus: "apply-leave" },
        ],
    })
        .select("fullName krsaId applyClub club clubStatus createdAt")
        .sort({ createdAt: -1 })
        .lean();

    const seenClubRequests = new Set();

    for (const skater of skaters) {
        const skaterId = String(skater._id);
        const inApplyClub = (skater.applyClub || []).some(
            (item) => String(item?._id ?? item) === clubIdStr
        );
        const isLeaveRequest =
            String(skater.club?._id ?? skater.club ?? "") === clubIdStr &&
            skater.clubStatus === "apply-leave";

        if (isLeaveRequest) {
            const key = `leave:${skaterId}`;
            if (!seenClubRequests.has(key)) {
                seenClubRequests.add(key);
                data.push(
                    formatApplyListItem(
                        "leaveClub",
                        skater._id,
                        skater.fullName,
                        skater.createdAt,
                        { krsaId: skater.krsaId || "", skaterID: skaterId }
                    )
                );
            }
            continue;
        }

        if (inApplyClub) {
            const key = `join:${skaterId}`;
            if (!seenClubRequests.has(key)) {
                seenClubRequests.add(key);
                data.push(
                    formatApplyListItem(
                        "joinClub",
                        skater._id,
                        skater.fullName,
                        skater.createdAt,
                        { krsaId: skater.krsaId || "", skaterID: skaterId }
                    )
                );
            }
        }
    }

    const clubMemberIds = await Skater.find({
        role: "Skater",
        $or: [{ club: clubOid }, { applyClub: clubOid }],
    })
        .select("_id")
        .lean();

    const memberIdList = clubMemberIds.map((row) => row._id);

    if (memberIdList.length > 0) {
        const skaterProfileRows = await Skater.find({ _id: { $in: memberIdList } })
            .select("fullName krsaId")
            .lean();
        const skaterProfileById = new Map(
            skaterProfileRows.map((row) => [String(row._id), row])
        );

        const certificationApplications = await EventParticipant.find({
            userId: { $in: memberIdList },
            skaterApply: true,
            clubAllow: false,
        })
            .select("userId ageGroup eventId updatedAt createdAt")
            .populate({ path: "eventId", select: "header" })
            .sort({ updatedAt: -1 })
            .lean();

        const seenCertApplications = new Set();

        for (const participant of certificationApplications) {
            const skaterId = String(participant.userId || "");
            if (!skaterId || seenCertApplications.has(participant._id.toString())) {
                continue;
            }
            seenCertApplications.add(participant._id.toString());

            const skaterProfile = skaterProfileById.get(skaterId);

            data.push(
                formatApplyListItem(
                    "certificateRequest",
                    participant._id,
                    skaterProfile?.fullName || "",
                    participant.updatedAt || participant.createdAt,
                    {
                        skaterID: skaterId,
                        krsaId: skaterProfile?.krsaId || "",
                        eventName: participant.eventId?.header || "",
                        ageGroup: participant.ageGroup || "",
                    }
                )
            );
        }
    }

    data.sort((a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime());

    const total = data.length;
    const paged = data.slice(skip, skip + pageLimit).map(({ sortAt, ...row }) => row);

    const countByType = (type) => data.filter((row) => row.type === type).length;

    return {
        total,
        page: currentPage,
        limit: pageLimit,
        totalPages: Math.ceil(total / pageLimit) || 0,
        counts: {
            joinClub: countByType("joinClub"),
            leaveClub: countByType("leaveClub"),
            certificateRequest: countByType("certificateRequest"),
        },
        data: paged,
    };
};

const CLUB_SKATER_LIST_STATUSES = ["join", "apply-leave"];

export const display_all_club_skater_repositories = async (
    clubMemberId,
    { page, limit } = {}
) => {
    const club = await resolveClubIdFromClubMember(clubMemberId);
    const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);

    const filter = {
        club: club._id,
        role: "Skater",
        clubStatus: { $in: CLUB_SKATER_LIST_STATUSES },
    };

    const [total, skaters] = await Promise.all([
        Skater.countDocuments(filter),
        Skater.find(filter)
            .select("fullName photo profile krsaId createdAt")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageLimit)
            .lean(),
    ]);

    return {
        clubId: club._id,
        clubName: club.name || "",
        data: skaters.map((skater) => ({
            id: skater._id,
            name: skater.fullName || "",
            profile: skater.photo || skater.profile || "",
            krsaId: skater.krsaId || "",
        })),
        pagination: {
            total,
            page: currentPage,
            limit: pageLimit,
            totalPages: Math.ceil(total / pageLimit) || 0,
        },
    };
};

export const display_club_skater_details_repositories = async (
    clubMemberId,
    skaterId
) => {
    const club = await resolveClubIdFromClubMember(clubMemberId);
    const rawId = String(skaterId || "").trim();

    if (!rawId) {
        throw new AppError("Skater id is required", 400);
    }

    const skater = await Skater.findOne({
        _id: rawId,
        club: club._id,
        role: "Skater",
    })
        .select("-refreshTokens -firebaseTokens")
        .populate("club", "name clubId img districtName")
        .populate("category", "typeName")
        .populate("discipline", "name title")
        .populate("applyClub", "name clubId")
        .lean();

    if (!skater) {
        throw new AppError("Skater not found in this club", 404);
    }

    return {
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
        discipline: skater.discipline?.name || skater.discipline?.title || "",
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
              }
            : null,
        applyClub: (skater.applyClub || []).map((item) => ({
            _id: item?._id,
            name: item?.name || "",
            clubId: item?.clubId || "",
        })),
        documents: skater.documents || [],
        createdAt: skater.createdAt,
        updatedAt: skater.updatedAt,
    };
};

export const remove_skater_from_club_repositories = async (
    clubMemberId,
    skaterId
) => {
    const club = await resolveClubIdFromClubMember(clubMemberId);
    const rawId = String(skaterId || "").trim();

    if (!rawId) {
        throw new AppError("Skater id is required", 400);
    }

    const updated = await Skater.findOneAndUpdate(
        {
            _id: rawId,
            club: club._id,
            role: "Skater",
        },
        {
            $set: {
                club: null,
                clubStatus: "apply",
            },
            $pull: { applyClub: club._id },
        },
        { new: true }
    )
        .select("_id fullName krsaId club clubStatus")
        .lean();

    if (!updated) {
        throw new AppError("Skater not found in this club", 404);
    }

    return {
        id: updated._id,
        fullName: updated.fullName || "",
        krsaId: updated.krsaId || "",
        club: "",
        clubStatus: updated.clubStatus || "apply",
    };
};

export const addSkaterByClubRepository = async (clubMemberId, skaterData) => {
    const club = await Club.findOne({
        $or: [{ _id: clubMemberId }, { members: clubMemberId }],
    })
        .select("_id name district districtName")
        .lean();

    if (!club) {
        throw new AppError("Club not found for this club member", 404);
    }

    if (!hasDistrictRef(club.district)) {
        throw new AppError(
            "Cannot add skater. Club is not under any district",
            403
        );
    }

    const { fullName, phone, address, gender, email } = skaterData;

    const [existingPhone, existingEmail] = await Promise.all([
        BaseAuth.findOne({ phone }).select("_id").lean(),
        BaseAuth.findOne({ email: email.toLowerCase() }).select("_id").lean(),
    ]);

    if (existingPhone) {
        throw new AppError("This phone number is already registered", 409);
    }
    if (existingEmail) {
        throw new AppError("This email is already in use", 409);
    }

    const skater = await new Skater({
        fullName: fullName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        gender: gender.toLowerCase(),
        email: email.toLowerCase().trim(),
        district: club.district,
        club: club._id,
        clubStatus: "join",
        role: "Skater",
        verify: false,
    }).save();

    // if (!skater.verify) {
    //     await Skater.findByIdAndUpdate(skater._id, { $set: { verify: true } }, { new: false });
    //     skater.verify = true;
    // }

    return {
        id: skater._id,
        krsaId: skater.krsaId || "",
        fullName: skater.fullName || "",
        phone: skater.phone || "",
        email: skater.email || "",
        address: skater.address || "",
        gender: skater.gender || "",
        district: club.district,
        districtName: club.districtName || "",
        club: club._id,
        clubName: club.name || "",
        verify: Boolean(skater.verify),
    };
};

export {
    allClubsInDbRepository,
    allClubsRepository,
    // displayDistrictFullDetailsRepository,
    isExistClub,
    createClubRepository,
    clubIdStoreinDestrict,
    displayFullDetailsOfClub,
    isThisClubExist,
    updateClubDetails,
    deleteClubDetails,
    clubsByDistrictPaginatedRepository,
    clubsForSkaterUserRepository,
    isExistClubRepository,
    apply_club_repositories,
    isApplyRepository,
    isAlreadyAppliedToClubRepository,
    approve_join_club_repositories,
    apply_leave_repository,
    approve_leave_club_repositories,
    reject_leave_club_repositories,
    reject_leave_district_affiliation_repository,
    resolveClubIdFromClubMember,
    display_existing_club_repositories,
    display_all_apply_skater_repositories,
}