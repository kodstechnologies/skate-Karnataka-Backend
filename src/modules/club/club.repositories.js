import { paginate } from "../../util/common/paginate.js";
import { AppError } from "../../util/common/AppError.js";
// import { Skater } from "../auth/skater.model.js";
import { District } from "../district/district.model.js";
import { Skater } from "../skater/skater.model.js";
import { Event } from "../event/event.model.js";
import { Club } from "./club.model.js";
import { BaseAuth } from "../auth/baseAuth.model.js";

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

    // 2️⃣ Total Skaters
    const totalSkaters = await Skater.countDocuments({
        club: club._id,
        discipline: "join",
    });

    // 3️⃣ Latest Joined Skaters
    const latestSkaters = await Skater.find({
        club: club._id,
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


export const displayClubProfileRepositories = async (userId) => {
    const club = await Club.findOne({ members: userId })
        .select("name img address district districtName districtStatus about rank championships clubId members")
        .populate("district", "name")
        .populate("members", "_id fullName phone email role krsaId")
        .lean();

    if (!club) return null;

    // const totalSkater = await Skater.countDocuments({
    //     club: clubId,
    //     clubStatus: "join",
    //     role: "Skater",
    // });

    return {
        id: String(club._id),
        name: club.name || "",
        image: club.img || "",
        address: club.address || "",
        districtName: club.district?.name || club.districtName || "",
        districtStatus: club.districtStatus || "",
        about: club.about || "",
        rank: club.rank ?? 0,
        championships: club.championships ?? 0,
        clubId: club.clubId || "",
        totalMembers: (club.members || []).length,
        members: club.members || [],
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

export const exceptOwnDistrictDisplayAllDistrictRepository = async (id) => {
    // Accept either Club document _id or authenticated BaseAuth _id.
    const club = await Club.findOne({
        $or: [{ _id: id }, { members: id }],
    })
        .select("district")
        .lean();

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

export const applyForDistrictRepository = async (
   memberOrClubId,
   districtId
) => {

 const district = await District.findById(districtId)
   .select("_id name");

 if(!district){
   throw new AppError("District not found",404);
 }

 // find club either by club id OR member id
 const club = await Club.findOne({
    $or:[
      {_id: memberOrClubId},
      {members: memberOrClubId}
    ]
 });
console.log(club,"club")
 if(!club){
   throw new AppError(
     "Club or club membership not found",
     404
   );
 }

 if (
   club.district &&
   club.districtStatus === "join"
 ){
   throw new AppError(
      "Already affiliated",
      400
   );
 }

 const updatedClub =
 await Club.findByIdAndUpdate(
   club._id,
   {
     $addToSet:{
       applyDistrict: district._id
     },
     $set:{
       districtStatus:"apply"
     }
   },
   {new:true}
 );

 return {
   clubId: updatedClub._id,
   appliedDistrictCount:
      updatedClub.applyDistrict.length,
   districtStatus:
      updatedClub.districtStatus
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
        "img name clubId districtName officeAddress about rank championships"
    );
    return r;
};

const display_all_apply_skater_repositories = async (clubId) => {
    const club = await Club.findOne({
        $or: [{ _id: clubId }, { members: clubId }],
    })
        .select("_id")
        .lean();

    if (!club) {
        throw new AppError("Club not found", 404);
    }

    const query = {
        role: "Skater",
        $or: [
            {
                applyClub: club._id,
                clubStatus: "apply",
            },
            {
                club: club._id,
                clubStatus: "apply-leave",
            },
        ],
    };

    const skaters = await Skater.find(query)
        .select("fullName phone gender photo krsaId clubStatus applyClub club")
        .sort({ createdAt: -1 })
        .lean();

    return skaters.map((skater) => ({
        ...skater,
        status: skater.clubStatus,
        clubId: club._id,
    }));
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
    isAlreadyAppliedToClubRepository,
    approve_join_club_repositories,
    apply_leave_repository,
    approve_leave_club_repositories,
    display_existing_club_repositories,
    display_all_apply_skater_repositories
}