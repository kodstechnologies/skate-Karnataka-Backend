import { District } from "../district/district.model.js";
import { Club } from "./club.model.js";

const allClubsRepository = async (name) => {
    const district = await District.findOne({ name })
        .populate({
            path: "club",
            select: "name"
        })
        .lean();

    if (!district) {
        throw new Error("District not found");
    }

    return district;
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

const isThisClubExist = async(id) =>{
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

export {
    allClubsRepository,
    isExistClub,
    createClubRepository,
    clubIdStoreinDestrict,
    displayFullDetailsOfClub,
    isThisClubExist,
    updateClubDetails,
    deleteClubDetails
}