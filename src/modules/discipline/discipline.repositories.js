import mongoose from "mongoose";
import { DisciplineService } from "./discipline.model.js";
import { Skater } from "../skater/skater.model.js";

const get_all_discipline_repositories = async () => {
    return await DisciplineService.find({})
        .sort({ name: 1 })
        .lean();
};

const get_single_discipline_repositories = async (id) => {
    return await DisciplineService.findById(id).lean();
};

const create_discipline_repositories = async (payload) => {
    return await DisciplineService.create(payload);
};

const update_discipline_repositories = async (id, payload) => {
    return await DisciplineService.findByIdAndUpdate(
        id,
        { $set: payload },
        { new: true, runValidators: true }
    ).lean();
};

const delete_discipline_repositories = async (id) => {
    return await DisciplineService.findByIdAndDelete(id).lean();
};

const get_discipline_by_name_repositories = async (name) => {
    return await DisciplineService.findOne({ name }).lean();
};

const count_skaters_using_discipline_repositories = async (id) => {
    if (!id || !mongoose.Types.ObjectId.isValid(String(id))) {
        return 0;
    }

    return await Skater.countDocuments({ discipline: id });
};

export {
    get_all_discipline_repositories,
    get_single_discipline_repositories,
    create_discipline_repositories,
    update_discipline_repositories,
    delete_discipline_repositories,
    get_discipline_by_name_repositories,
    count_skaters_using_discipline_repositories,
};
