import { AppError } from "../../util/common/AppError.js";
import { allClubsRepository, clubIdStoreinDestrict, createClubRepository, deleteClubDetails, displayFullDetailsOfClub, isExistClub, isThisClubExist, updateClubDetails } from "./club.repositories.js";

const allClubService = async (name) => {
    return await allClubsRepository(name);
}

const createClubService = async (data) => {
    const { name } = data;
    const isExist = await isExistClub(name);   // pass name
    if (isExist) {
        throw new AppError(
            "This name already taken, please give a new name",
            409
        );
    }
    const clubData = await createClubRepository(data);   //  create
    await clubIdStoreinDestrict(clubData.district, clubData._id)
};

const displaySingleClubService = async (id) => {
    const isExistClub = await isThisClubExist(id)
    if(!isExistClub){
        throw new AppError("This Club is currently not available",404)
    }
    return await displayFullDetailsOfClub(id);
}

const updateClubDetailsService = async (data ,id) =>{
    await updateClubDetails(data , id);
}

const deleteClubSchema = async(id) =>{
    await deleteClubDetails(id);
}
export {
    allClubService,
    createClubService,
    displaySingleClubService,
    updateClubDetailsService,
    deleteClubSchema
}