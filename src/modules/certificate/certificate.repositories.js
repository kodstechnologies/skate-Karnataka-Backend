import { paginate } from "../../util/common/paginate.js";
import { BaseAuth } from "../auth/baseAuth.model.js";
import { Certificate } from "./certificate.model.js"

const create_certificate_repositories = async (data) => {
    await Certificate.create(data);
}

const getKRSAID = async(id) => {
    console.log(id,"]]]]]")
    const skater = await BaseAuth.findById(id).select("krsaId");

    if (!skater) {
        throw new Error("User not found");
    }

    if (!skater.krsaId) {
        throw new Error("KRSA ID not found for this user");
    }

    return skater.krsaId;
};

const display_all_certificate_repositories = async (id, page, limit) => {
    const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);

    const [data, total] = await Promise.all([
        Certificate.find({ winnerKRSAId: id }).select("name certificateID division request clubAllow districtAllow stateAllow")
            .skip(skip)
            .sort({createdAt: -1})
            .limit(pageLimit),
        Certificate.countDocuments({ winnerKRSAId: id })
    ]);

    return {
        data,
        total,
        page: currentPage,
        totalPages: Math.ceil(total / pageLimit)
    };
};

const apply_request_repositories = async ( id) => {
    await Certificate.findByIdAndUpdate(
        id,
        { request: true },
    );
};

export {
    create_certificate_repositories,
    getKRSAID,
    display_all_certificate_repositories,
    apply_request_repositories,
}