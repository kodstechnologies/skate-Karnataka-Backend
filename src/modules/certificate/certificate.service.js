import {
    create_certificate_repositories,
    display_all_certificate_repositories,
    getKRSAID,
    create_template_repository,
    update_template_repository,
    set_active_template_repository,
    get_all_templates_repository,
    get_template_repository,
    get_template_by_id_repository,
    get_certificate_by_id_repository,
    get_user_by_krsa_repository,
} from "./certificate.repositories.js";
import { putObject } from "../../util/aws/putObject.js";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import axios from "axios";

const create_certificate_services = async (data) => {
    await create_certificate_repositories(data);
};

const display_all_certificate_service = async ({ id, page, limit }) => {
    console.log(id, page, limit, "=====");

    const krsaID = await getKRSAID(id);
    return await display_all_certificate_repositories(krsaID, page, limit);
};

// ---------------------------------------------------------------------------
// Create a brand-new template.
// `file` may be undefined when we only want to store a layout without a PDF —
// but per the controller the first upload always requires a PDF file.
// ---------------------------------------------------------------------------
const create_template_service = async (name, file, layout) => {
    if (!layout || typeof layout !== "object") {
        throw new Error("Invalid layout: must be a non-null object");
    }

    let pdfUrl = "none";
    if (file) {
        const uploadRes = await putObject(file, "certificate-templates");
        pdfUrl = uploadRes.url;
    }

    return await create_template_repository(name, pdfUrl, layout);
};

// ---------------------------------------------------------------------------
// Update an existing template by its _id.
// Only the fields present in the payload are updated.
// ---------------------------------------------------------------------------
const update_template_service = async (id, file, { name, layout }) => {
    if (!layout || typeof layout !== "object") {
        throw new Error("Invalid layout: must be a non-null object");
    }

    let pdfUrl = undefined;
    if (file) {
        const uploadRes = await putObject(file, "certificate-templates");
        pdfUrl = uploadRes.url;
    }

    const updated = await update_template_repository(id, { name, pdfUrl, layout });
    if (!updated) {
        throw new Error("Template not found");
    }
    return updated;
};

// ---------------------------------------------------------------------------
// Mark one template as active (deactivates all others).
// ---------------------------------------------------------------------------
const set_active_template_service = async (id) => {
    const updated = await set_active_template_repository(id);
    if (!updated) {
        throw new Error("Template not found");
    }
    return updated;
};

// ---------------------------------------------------------------------------
// Return all templates (lightweight — for dropdown list).
// ---------------------------------------------------------------------------
const get_all_templates_service = async () => {
    return await get_all_templates_repository();
};

// ---------------------------------------------------------------------------
// Return the active template (used by the generate flow and the admin
// settings panel to pre-populate the current active template).
// ---------------------------------------------------------------------------
const get_template_service = async () => {
    const template = await get_template_repository();
    if (!template) return null;
    return {
        pdfTemplateUrl: template.pdfUrl,
        textLayout: template.layout || {},
    };
};

// ---------------------------------------------------------------------------
// Return a single template by _id with its full layout (for the edit modal).
// ---------------------------------------------------------------------------
const get_template_by_id_service = async (id) => {
    const template = await get_template_by_id_repository(id);
    if (!template) throw new Error("Template not found");
    return {
        _id: template._id,
        name: template.name,
        isActive: template.isActive,
        pdfTemplateUrl: template.pdfUrl,
        textLayout: template.layout || {},
    };
};

const getColor = (colorStr) => {
    switch (colorStr) {
        case "white":
            return rgb(1, 1, 1);
        case "darkBlue":
            return rgb(0.1, 0.2, 0.4);
        case "darkYellow":
            return rgb(0.8, 0.6, 0);
        default:
            return rgb(0, 0, 0);
    }
};

const generate_certificate_service = async (userData) => {
    console.log("service Generating certificate for userData:", userData);
    const template = await get_template_service();
    if (!template || !template.pdfTemplateUrl) {
        throw new Error("No active certificate template found. Please set a template as active before generating.");
    }

    // Fetch the template PDF from S3/AWS
    const response = await axios.get(template.pdfTemplateUrl, { responseType: "arraybuffer" });
    const pdfDoc = await PDFDocument.load(response.data);

    // getPages() returns the array; index [0] gives the first (and only) page.
    const page = pdfDoc.getPages()[0];
    const { width, height } = page.getSize();

    const layout = template.textLayout || {};

    // ── Coordinate scaling ────────────────────────────────────────────────
    const TEMPLATE_ASSUMED_W = 842;
    const TEMPLATE_ASSUMED_H = 595;
    const scaleX = width / TEMPLATE_ASSUMED_W;
    const scaleY = height / TEMPLATE_ASSUMED_H;

    // ── Fonts ─────────────────────────────────────────────────────────────
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const emphasizedFont = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
    const signatureFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

    // ── Color resolver (matches frontend color tokens) ────────────────────
    const resolveColor = (colorName, fallback) => {
        const map = {
            white: rgb(1, 1, 1),
            darkBlue: rgb(0.09, 0.18, 0.52),
            darkYellow: rgb(1, 0.66, 0),
        };
        return map[colorName] || fallback;
    };

    // ── Field-specific layout defaults (fallback if DB has no layout) ─────
    const DEFAULT_COLOR = rgb(1, 1, 1);
    const namePosRaw = layout.name || { x: TEMPLATE_ASSUMED_W / 2, y: TEMPLATE_ASSUMED_H / 2, size: 18 };
    const fieldPosRaw = layout.field || { x: TEMPLATE_ASSUMED_W / 2, y: TEMPLATE_ASSUMED_H / 2 - 40, size: 16 };
    const clubPosRaw = layout.clubName || { x: TEMPLATE_ASSUMED_W / 2, y: TEMPLATE_ASSUMED_H / 2 - 80, size: 14 };
    const rankPosRaw = layout.Rank || { x: TEMPLATE_ASSUMED_W / 2, y: TEMPLATE_ASSUMED_H / 2 - 120, size: 14 };
    const datePosRaw = layout.issueDate || { x: TEMPLATE_ASSUMED_W / 2, y: 60, size: 12 };
    const signaturePosRaw = layout.signature || { x: 690, y: 92, size: 12 };

    // ── NAME ─────────────────────────────────────────────────────────────
    const nameSize = (namePosRaw.size || 18) * Math.min(scaleX, scaleY);
    const nameX = namePosRaw.x * scaleX;
    const nameY = (namePosRaw.y + nameSize) * scaleY;
    const nameText = String(userData.name || "");
    const nameWidth = emphasizedFont.widthOfTextAtSize(nameText, nameSize);
    if (nameText) {
        page.drawText(nameText, {
            x: Math.round(nameX - nameWidth / 2),
            y: Math.round(nameY - 10),
            size: nameSize,
            font: emphasizedFont,
            color: resolveColor(namePosRaw.color, DEFAULT_COLOR),
        });
    }

    // ── FIELD / EVENT ────────────────────────────────────────────────────
    const fieldSize = (fieldPosRaw.size || 16) * Math.min(scaleX, scaleY);
    const fieldX = fieldPosRaw.x * scaleX;
    const fieldY = fieldPosRaw.y * scaleY + fieldSize;
    const fieldText = String(userData.field || "");
    const fieldWidth = emphasizedFont.widthOfTextAtSize(fieldText, fieldSize);
    if (fieldText) {
        page.drawText(fieldText, {
            x: Math.round(fieldX + fieldWidth / 2),
            y: Math.round(fieldY - 10),
            size: fieldSize,
            font: emphasizedFont,
            color: resolveColor(fieldPosRaw.color, rgb(1, 1, 0)),
        });
    }

    // ── CLUB NAME ────────────────────────────────────────────────────────
    const clubSize = (clubPosRaw.size || 14) * Math.min(scaleX, scaleY);
    const clubX = clubPosRaw.x * scaleX;
    const clubY = clubPosRaw.y * scaleY + clubSize;
    const clubText = String(userData.clubName || "");
    const clubWidth = emphasizedFont.widthOfTextAtSize(clubText, clubSize);
    if (clubText) {
        page.drawText(clubText, {
            x: Math.round(clubX - clubWidth / 2),
            y: Math.round(clubY - 10),
            size: clubSize,
            font: emphasizedFont,
            color: resolveColor(clubPosRaw.color, DEFAULT_COLOR),
        });
    }

    // ── RANK ─────────────────────────────────────────────────────────────
    const rankSize = (rankPosRaw.size || 14) * Math.min(scaleX, scaleY);
    const rankX = rankPosRaw.x * scaleX;
    const rankY = rankPosRaw.y * scaleY + rankSize;
    const rankText = String(userData.Rank || "");
    const rankWidth = emphasizedFont.widthOfTextAtSize(rankText, rankSize);
    if (rankText) {
        page.drawText(rankText, {
            x: Math.round(rankX + rankWidth + rankWidth * 0.5),
            y: Math.round(rankY - 8),
            size: rankSize,
            font: emphasizedFont,
            color: resolveColor(rankPosRaw.color, DEFAULT_COLOR),
        });
    }

    // ── ISSUE DATE ───────────────────────────────────────────────────────
    const dateSize = (datePosRaw.size || 12) * Math.min(scaleX, scaleY);
    const dateX = (datePosRaw.x - 12) * scaleX;
    const dateY = (datePosRaw.y - dateSize) * scaleY;
    const dateText = String(userData.issueDate || "");
    const dateWidth = font.widthOfTextAtSize(dateText, dateSize);
    if (dateText) {
        page.drawText(dateText, {
            x: Math.round(dateX - dateWidth * 1.5),
            y: Math.round(dateY + 5),
            size: dateSize,
            font: emphasizedFont,
            color: resolveColor(datePosRaw.color, DEFAULT_COLOR),
        });
    }

    // ── SIGNATURE ────────────────────────────────────────────────────────
    const signatureText = String(layout?.signature?.text || "")
        .trim()
        .slice(0, 80);
    if (signatureText) {
        const sigSize = (signaturePosRaw.size || 12) * Math.min(scaleX, scaleY) * 1.12;
        const sigX = (signaturePosRaw.x + 12) * scaleX;
        const sigY = signaturePosRaw.y * scaleY;
        const sigWidth = signatureFont.widthOfTextAtSize(signatureText, sigSize);
        const sigColor = resolveColor(signaturePosRaw.color, rgb(1, 0.66, 0));

        // Pass 1 — shadow
        page.drawText(signatureText, {
            x: sigX + sigWidth / 2,
            y: sigY - 5,
            size: sigSize,
            font: signatureFont,
            color: sigColor,
            rotate: degrees(0),
            opacity: 0.45,
        });

        // Pass 2 — solid
        page.drawText(signatureText, {
            x: sigX + sigWidth / 2,
            y: sigY - 5,
            size: sigSize,
            font: signatureFont,
            color: sigColor,
            rotate: degrees(0),
        });
    }

    const generatedPdfBytes = await pdfDoc.save();

    // Upload generated PDF to S3
    const fileToUpload = {
        buffer: Buffer.from(generatedPdfBytes),
        mimetype: "application/pdf",
        originalname: `certificate_${userData.winnerKRSAId}.pdf`,
    };
    const uploadRes = await putObject(fileToUpload, "certificates");

    // Look up the user's ObjectId from their KRSA ID
    const userRecord = await get_user_by_krsa_repository(userData.winnerKRSAId);

    // Save certificate record to DB
    const certData = {
        winnerKRSAId: userData.winnerKRSAId,
        userId: userRecord?._id || null,
        pdfUrl: uploadRes.url,
        filename: uploadRes.key || `certificates/certificate_${userData.winnerKRSAId}.pdf`,
    };
    await create_certificate_repositories(certData);
    return certData;
};

const download_certificate_service = async (id) => {
    const certificate = await get_certificate_by_id_repository(id);
    if (!certificate || !certificate.pdfUrl) {
        throw new Error("Certificate not found or PDF not generated yet");
    }
    return certificate;
};

export {
    create_certificate_services,
    display_all_certificate_service,
    create_template_service,
    update_template_service,
    set_active_template_service,
    get_all_templates_service,
    get_template_service,
    get_template_by_id_service,
    generate_certificate_service,
    download_certificate_service,
};