import { paginate } from "../../util/common/paginate.js";
import { BaseAuth } from "../auth/baseAuth.model.js";
import { Certificate } from "./certificate.model.js";
import { CertificateTemplate } from "./certificateTemplate.model.js";

const create_certificate_repositories = async (data) => {
    await Certificate.create(data);
};

const getKRSAID = async (id) => {
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
        Certificate.find({ winnerKRSAId: id })
            .select("userId winnerKRSAId pdfUrl filename clubAllow districtAllow stateAllow")
            .skip(skip)
            .sort({ createdAt: -1 })
            .limit(pageLimit),
        Certificate.countDocuments({ winnerKRSAId: id }),
    ]);

    return {
        data,
        total,
        page: currentPage,
        totalPages: Math.ceil(total / pageLimit),
    };
};

/**
 * Create a brand-new certificate template document.
 * The caller is responsible for ensuring a pdfUrl is provided.
 */
const create_template_repository = async (name, pdfUrl, layout) => {
    return await CertificateTemplate.create({ name, pdfUrl, layout, isActive: false });
};

/**
 * Update an existing template by its MongoDB _id.
 * Only updates the fields that are provided (pdfUrl is optional).
 */
const update_template_repository = async (id, { name, pdfUrl, layout }) => {
    const update = { layout };
    if (name !== undefined) update.name = name;
    if (pdfUrl) update.pdfUrl = pdfUrl;

    return await CertificateTemplate.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
};

/**
 * Set one template as active and deactivate all others atomically.
 * Used by the "Set as Active" action in the admin UI.
 */
const set_active_template_repository = async (id) => {
    await CertificateTemplate.updateMany({}, { $set: { isActive: false } });
    return await CertificateTemplate.findByIdAndUpdate(id, { $set: { isActive: true } }, { new: true });
};

/**
 * Return all templates (lightweight projection for the dropdown list).
 */
const get_all_templates_repository = async () => {
    return await CertificateTemplate.find()
        .select("_id name isActive pdfUrl createdAt")
        .sort({ createdAt: -1 });
};

/**
 * Return the single template currently marked as active.
 * Used by the PDF generation service.
 */
const get_template_repository = async () => {
    return await CertificateTemplate.findOne({ isActive: true });
};

/**
 * Return a full template document by its _id (for the edit modal).
 */
const get_template_by_id_repository = async (id) => {
    return await CertificateTemplate.findById(id);
};

const get_certificate_by_id_repository = async (id) => {
    return await Certificate.findById(id).select("pdfUrl filename");
};

export {
    create_certificate_repositories,
    getKRSAID,
    get_user_by_krsa_repository,
    display_all_certificate_repositories,
    create_template_repository,
    update_template_repository,
    set_active_template_repository,
    get_all_templates_repository,
    get_template_repository,
    get_template_by_id_repository,
    get_certificate_by_id_repository,
};