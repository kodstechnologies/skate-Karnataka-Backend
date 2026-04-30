import { paginate } from "../../util/common/paginate.js";
import { BaseAuth } from "../auth/baseAuth.model.js";
import { Certificate } from "./certificate.model.js";
import { CertificateTemplate } from "./certificateTemplate.model.js";

const create_certificate_repositories = async (data) => {
    await Certificate.create(data);
}

const getKRSAID = async(id) => {
   
    const skater = await BaseAuth.findById(id).select("krsaId");

    if (!skater) {
        throw new Error("User not found");
    }

    if (!skater.krsaId) {
        throw new Error("KRSA ID not found for this user");
    }

    return skater.krsaId;
};

const get_user_by_krsa_repository = async (krsaId) => {
    return await BaseAuth.findOne({ krsaId }).select("_id");
};

const display_all_certificate_repositories = async (id, page, limit) => {
    const { skip, limit: pageLimit, page: currentPage } = paginate(page, limit);

    const [data, total] = await Promise.all([
        Certificate.find({ winnerKRSAId: id }).select("userId winnerKRSAId pdfUrl filename clubAllow districtAllow stateAllow")
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

const save_template_repository = async (pdfUrl, layout) => {
    // Find existing template (assuming one active template for now)
    let template = await CertificateTemplate.findOne();
    
    if (template) {
        if (pdfUrl) template.pdfUrl = pdfUrl;
        template.layout = layout;
        await template.save();
    } else {
        template = await CertificateTemplate.create({
            pdfUrl: pdfUrl || "none",
            layout: layout
        });
    }
    return template;
};

const get_template_repository = async () => {
    return await CertificateTemplate.findOne();
};

const get_certificate_by_id_repository = async (id) => {
    return await Certificate.findById(id).select("pdfUrl filename");
};

export {
    create_certificate_repositories,
    getKRSAID,
    get_user_by_krsa_repository,
    display_all_certificate_repositories,
    save_template_repository,
    get_template_repository,
    get_certificate_by_id_repository
}