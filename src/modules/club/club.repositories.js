import { paginate } from "../../util/common/paginate.js";
import { BaseAuth } from "../auth/baseAuth.model.js";
import { Skater } from "../auth/skater.model.js";
import { District } from "../district/district.model.js";
import { Club } from "./club.model.js";

const allClubsRepository = async (id) => {
    return await District.findById(id)
        .populate({
            path: "club",
            select: "name" // ✅ only fetch club name
        });
};

const isExistClub = async (name) => {
    return await District.findOne({ name });
}

const createClubRepository = async (data) => {
    const { district, name, about, skaters, rank, championships } = data;
    const districtData = await District.findById(district).select("name");
    const districtName = districtData?.name;
    return await Club.create({ district, districtName, name, about, skaters, rank, championships });
}

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
        throw new Error("Club not found");
    }
}

const deleteClubDetails = async (id) => {
    await Club.findByIdAndDelete(id);
}

const clubsByDistrictPaginatedRepository = async (districtId, { page, limit }) => {
    const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);

    const filter = { district: districtId };

    const clubs = await Club.find(filter)
        .select("_id name img")
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
    return !!skater?.club;
};


const apply_club_repositories = async (clubId, skaterId) => {
    const updatedSkater = await Skater.findByIdAndUpdate(
        skaterId,
        {
            club: clubId,
            clubStatus: "apply",
        },
        { new: true }
    )
    console.log(updatedSkater, "updatedSkater");
}

const isApplyRepository = async (id) => {
    const skater = await Skater.findById(id)

    return skater?.clubStatus;
}

const approve_join_club_repositories = async (skaterId) => {
    await Skater.findByIdAndUpdate(
        skaterId,
        {
            clubStatus: "join",
        },
        { new: true }
    )
}

const apply_leave_repository = async (skaterId) => {
    return await Skater.findOneAndUpdate(
        { _id: skaterId, clubStatus: "join" }, // only if joined
        {
            clubStatus: "leave",
            club: null,
        },
        { new: true }
    );
};
export {
    allClubsRepository,
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
    apply_leave_repository
}