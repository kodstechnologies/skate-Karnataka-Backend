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

const clubIdStoreinDestrict = async(districtId ,clubId)=> {
await District.findByIdAndUpdate(
    districtId,
    {
        $push: {club: clubId}
    },{
        new :true
    }
);
}

export {
    allClubsRepository,
    isExistClub,
    createClubRepository,
    clubIdStoreinDestrict
}