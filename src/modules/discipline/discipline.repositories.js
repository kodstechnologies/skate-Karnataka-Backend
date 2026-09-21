import mongoose from "mongoose";
import SkatingEventCategory from "../event/SkatingEventCategory.model.js";
import { Skater } from "../skater/skater.model.js";
import { categoryNameOf } from "../event/skatingEventCategory.sync.js";

const flattenDisciplines = (categories = []) =>
    categories.flatMap((category) =>
        (category.disciplines || []).map((discipline) => ({
            ...discipline,
            parentCategoryId: category._id,
            parentCategoryName: categoryNameOf(category),
        }))
    );

const get_all_discipline_repositories = async () => {
    const categories = await SkatingEventCategory.find({})
        .select("name disciplines")
        .sort({ name: 1 })
        .lean();
    return flattenDisciplines(categories).sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""))
    );
};

const get_single_discipline_repositories = async (id) => {
    const category = await SkatingEventCategory.findOne({ "disciplines._id": id }).lean();
    if (!category) {
        return null;
    }
    const discipline = (category.disciplines || []).find((row) => String(row._id) === String(id));
    if (!discipline) {
        return null;
    }
    return {
        ...discipline,
        parentCategoryId: category._id,
        parentCategoryName: categoryNameOf(category),
    };
};

const create_discipline_repositories = async (payload) => {
    const categoryId = payload.parentCategoryId || payload.categoryId;
    if (!categoryId || !mongoose.Types.ObjectId.isValid(String(categoryId))) {
        const error = new Error("categoryId is required to create a discipline");
        error.statusCode = 400;
        throw error;
    }

    const doc = await SkatingEventCategory.findById(categoryId);
    if (!doc) {
        return null;
    }

    doc.disciplines.push({
        name: payload.name,
        ageGroups: payload.ageGroups || [],
        customCategoryNames: payload.customCategoryNames || [],
    });
    await doc.save();
    const created = doc.disciplines[doc.disciplines.length - 1];
    return {
        ...created.toObject(),
        parentCategoryId: doc._id,
        parentCategoryName: doc.name,
    };
};

const update_discipline_repositories = async (id, payload) => {
    const doc = await SkatingEventCategory.findOne({ "disciplines._id": id });
    if (!doc) {
        return null;
    }
    const discipline = doc.disciplines.id(id);
    if (!discipline) {
        return null;
    }
    if (payload.name) {
        discipline.name = payload.name;
    }
    if (Array.isArray(payload.ageGroups)) {
        discipline.ageGroups = payload.ageGroups;
    }
    await doc.save();
    return {
        ...discipline.toObject(),
        parentCategoryId: doc._id,
        parentCategoryName: doc.name,
    };
};

const delete_discipline_repositories = async (id) => {
    const doc = await SkatingEventCategory.findOne({ "disciplines._id": id });
    if (!doc) {
        return null;
    }
    const discipline = doc.disciplines.id(id);
    if (!discipline) {
        return null;
    }
    const snapshot = discipline.toObject();
    discipline.deleteOne();
    await doc.save();
    return snapshot;
};

const get_discipline_by_name_repositories = async (name) => {
    const trimmed = String(name || "").trim();
    if (!trimmed) {
        return null;
    }
    const category = await SkatingEventCategory.findOne({
        "disciplines.name": trimmed,
    }).lean();
    if (!category) {
        return null;
    }
    const discipline = (category.disciplines || []).find(
        (row) => String(row.name).trim().toLowerCase() === trimmed.toLowerCase()
    );
    return discipline
        ? {
              ...discipline,
              parentCategoryId: category._id,
              parentCategoryName: categoryNameOf(category),
          }
        : null;
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
