import { Event } from "../model/event.model.js";
import { paginate } from "../../../util/common/paginate.js";

const displayAllEventRepository = async ({ page, limit }) => {

    const { skip, limit: pageLimit, page: currentPage } =
        paginate(page, limit);

    const events = await Event.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit)
        .lean();

    const total = await Event.countDocuments();

    return {
        total,
        page: currentPage,
        limit: pageLimit,
        totalPages: Math.ceil(total / pageLimit),
        data: events
    };
};


const displaySingleEventRepository = async (data) => {
    const { eventId } = data;
    return await Event.findById(eventId).lean();
}

export {
    displayAllEventRepository,
    displaySingleEventRepository
};

