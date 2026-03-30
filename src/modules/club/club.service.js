import { AppError } from "../../util/common/AppError.js";
import { allClubsRepository, clubIdStoreinDestrict, createClubRepository, isExistClub } from "./club.repositories.js";

const allClubService = async (id) => {
    return await allClubsRepository(id);
}

const createClubService = async (data) => {
    const { name } = data;
    console.log(name, data, "====")
    const isExist = await isExistClub(name);   // pass name
    console.log(isExist, "isExist");
    if (isExist) {
        throw new AppError(
            "This name already taken, please give a new name",
            409
        );
    }
    console.log("hjjj")
    const clubData = await createClubRepository(data);   //  create
    console.log(clubData,"clubData")
    await clubIdStoreinDestrict(clubData.district ,clubData._id)
};
export {
    allClubService,
    createClubService,

}