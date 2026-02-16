import { AppError } from "../../../util/common/AppError.js";
import { displaySingleEventRepository, displayAllEventRepository } from "../repositorie/event.repositorie.js";

const displayEventServer = async (data) => {

    const { page, limit } = data;

    const result = await displayAllEventRepository({
        page,
        limit
    });

    if (!result || result.data.length === 0) {
        throw new AppError("No events found", 404);
    }

    return result;
};


const displaySingleEventdetailsServer = async (data) => {
    return await displaySingleEventRepository(data);
}


export {
    displayEventServer,
    displaySingleEventdetailsServer
};
