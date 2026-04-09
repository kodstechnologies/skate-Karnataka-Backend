import { Event } from "./event.model.js";
import { paginate } from "../../util/common/paginate.js";

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

const display_latest_event_repositories = async () => {

    const events = await Event.find({ status: "active" }) // only active
        .sort({ createdAt: -1 }) // latest first
        .limit(1); // optional: only top 5

    return events;
};

const create_event_repositories = async (data) => {
    const event = await Event.create(data);
    console.log(event, "event details");
}

const edit_event_repositories = async (id, data) => {
    const event = await Event.findByIdAndUpdate(
        id,
        data,
        { new: true }
    );

    return event;
};

const delete_event_repositories = async (id) => {
    const event = await Event.findByIdAndDelete(id);
}

export {
    displayAllEventRepository,
    displaySingleEventRepository,
    display_latest_event_repositories,
    create_event_repositories,
    edit_event_repositories,
    delete_event_repositories
};

