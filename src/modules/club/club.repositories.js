import { paginate } from "../../util/common/paginate.js";
import { AppError } from "../../util/common/AppError.js";
// import { Skater } from "../auth/skater.model.js";
import { District } from "../district/district.model.js";
import { Skater } from "../skater/skater.model.js";
import { Event } from "../event/event.model.js";
import { Club } from "./club.model.js";

export const displayClubDashboardRepositories = async ({ clubId }) => {
    // 1️⃣ Get Club Details
    const club = await Club.findById(clubId)
        .select("name img championships rank")
        .lean();

    // 2️⃣ Total Skaters
    const totalSkaters = await Skater.countDocuments({
        club: clubId,
        discipline: "join",
    });

    // 3️⃣ Latest Joined Skaters
    const latestSkaters = await Skater.find({
        club: clubId,
        discipline: "join",
    })
        .select("fullName createdAt photo")
        .sort({ createdAt: -1 })
        .limit(1)
        .lean();

    return {
        clubName: club?.name || null,
        clubImage: club?.img || null,
        championships: club?.championships || 0,
        rank: club?.rank || 0,
        totalSkaters,
        latestSkaters,
    };
};

export const displayClubProfileRepositories = async (clubId) => {
    const club = await Club.findById(clubId)
        .select("name img address district districtName districtStatus about rank championships")
        .populate("district", "name")
        .lean();

    if (!club) return null;

    // const totalSkater = await Skater.countDocuments({
    //     club: clubId,
    //     clubStatus: "join",
    //     role: "Skater",
    // });

    return {
        name: club.name || "",
        image: club.img || "",
        // totalSkater,
        address: club.address || "",
        districtName: club.district?.name || club.districtName || "",
        districtStatus: club.districtStatus || "",
        // about: club.about || "",
        rank: club.rank ?? 0,
        // championships: club.championships ?? 0,
    };
};
export const affiliatedDistrictRepository = async (clubId) => {
    const club = await Club.findById(clubId)
        .select("district districtStatus")
        .lean();

    if (!club?.district) {
        return null;
    }

    const [district, totalClubs] = await Promise.all([
        District.findById(club.district)
            .select("name address img about rank championships")
            .lean(),

        Club.countDocuments({
            district: club.district
        }),
    ]);

    if (!district) {
        return null;
    }

    return {
        districtId: district._id,
        districtName: district.name || "",
        address: district.address || "",
        img: district.img || "",
        about: district.about || "",
        rank: district.rank ?? 0,
        championships: district.championships ?? 0,
        totalClubs,
        districtStatus: club.districtStatus || "" // added
    };
};

export const exceptOwnDistrictDisplayAllDistrictRepository = async (clubId) => {
    const club = await Club.findById(clubId).select("district").lean();
    if (!club) {
        return null;
    }

    const filter = club.district ? { _id: { $ne: club.district } } : {};

    const districts = await District.find(filter)
        .select("_id name img")
        .sort({ name: 1 })
        .lean();

    return districts;
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

export const applyForDistrictRepository = async (clubId, districtId) => {
    const [club, district] = await Promise.all([
        Club.findById(clubId).select("district districtStatus applyDistrict").lean(),
        District.findById(districtId).select("_id name").lean(),
    ]);

    if (!club) return null;
    if (!district) {
        throw new AppError("District not found", 404);
    }

    if (club.district && club.districtStatus === "join") {
        throw new AppError("Already affiliated with a district", 400);
    }

    const updatedClub = await Club.findByIdAndUpdate(
        clubId,
        {
            $addToSet: { applyDistrict: district._id },
            $set: { districtStatus: "apply" },
        },
        { new: true }
    )
        .select("applyDistrict districtStatus")
        .lean();

    return {
        appliedDistrictCount: updatedClub?.applyDistrict?.length || 0,
        districtStatus: updatedClub?.districtStatus || "apply",
    };
};

export const removeAffiliationRepository = async (clubId) => {
    const club = await Club.findById(clubId).select("district districtStatus").lean();
    if (!club) return null;

    if (!club.district) {
        throw new AppError("No district affiliation found", 400);
    }

    if (club.districtStatus !== "join") {
        throw new AppError("Only joined clubs can request affiliation removal", 400);
    }

    const updated = await Club.findByIdAndUpdate(
        clubId,
        { $set: { districtStatus: "apply-leave" } },
        { new: true }
    )
        .select("district districtStatus")
        .lean();

    return updated;
};

export const pendingApprovalsRepositories = async (clubId, { page, limit }) => {
    const { skip, limit: perPage, page: currentPage } = paginate(page, limit);

    const query = {
        applyClub: clubId,
        clubStatus: "apply",
        role: "Skater",
    };

    // ✅ Data
    const data = await Skater.find(query)
        .select("fullName phone gender createdAt photo krsaId")
        .sort({ createdAt: -1 })
        .skip(skip)           // ✅ pagination
        .limit(perPage)       // ✅ pagination
        .lean();

    // ✅ Total count
    const total = await Skater.countDocuments(query);

    return {
        data,
        pagination: {
            total,
            page: currentPage,
            limit: perPage,
            totalPages: Math.ceil(total / perPage),
        },
    };
};

const allClubsRepository = async (id, page, limit) => {
    const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);

    const [data, total, district] = await Promise.all([
        Club.find({ district: id })
            .select("_id name img address districtStatus")
            .skip(skip)
            .limit(pageLimit)
            .sort({ createdAt: -1 })
            .lean(),

        Club.countDocuments({ district: id }),

        District.findById(id).select("name")
    ]);

    const formattedData = data.map((club) => ({
        id: String(club._id),
        name: club.name,
        img: club.img || "",
        address: club.address || "",
        districtStatus: club.districtStatus || "",
    }));

    return {
        districtName: district?.name,
        data: formattedData,
        meta: {
            total,
            page: currentPage,
            limit: pageLimit,
            totalPages: Math.ceil(total / pageLimit)
        }
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
        fullName,
        phone,
        email,
        gender,
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
        fullName,
        phone,
        ...(email ? { email } : {}),
        ...(gender ? { gender } : {}),
        district,
        districtName,
        name,
        img,
        address,
        about,
        skaters,
        rank,
        championships,
        verify: true,
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

const clubsByDistrictPaginatedRepository = async (districtId, { page, limit }) => {
    const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);

    const filter = { district: districtId };

    const clubs = await Club.find(filter)
        .select("_id name img address districtStatus")
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

const approve_join_club_repositories = async (skaterId, ClubId) => {
    await Skater.findByIdAndUpdate(
        skaterId,
        {
            club: ClubId,
            clubStatus: "join",
            applyClub: [],
        },
        { new: true }
    )
}

export const reject_join_club_repositories = async (skaterId, clubId) => {
    const skater = await Skater.findByIdAndUpdate(
        skaterId,
        {
            $pull: {
                applyClub: clubId
            }
        },
        { new: true }
    );

    return skater;
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

const approve_leave_club_repositories = async (skaterId) => {
    return await Skater.findByIdAndUpdate(
        skaterId,
        {
            clubStatus: "leave",
            club: null,
        },
        { new: true }
    );
};

const display_existing_club_repositories = async (id) => {
    console.log(id, "----")
    const r = await Skater.findById(id).select("club").populate(
        "club",
        "img name clubId districtName address about rank championships"
    );
    return r;
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
    isExistClubRepository,
    apply_club_repositories,
    isApplyRepository,
    approve_join_club_repositories,
    apply_leave_repository,
    approve_leave_club_repositories,
    display_existing_club_repositories
}