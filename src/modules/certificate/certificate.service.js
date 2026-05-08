import {
    create_template_repository,
    update_template_repository,
    set_active_template_repository,
    get_all_templates_repository,
    get_template_repository,
    get_template_by_id_repository,
} from "./certificate.repositories.js";
import { putObject } from "../../util/aws/putObject.js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import axios from "axios";

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
const get_template_service = async (id) => {
    const template = await get_template_repository(id);
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


const generate_certificate_service = async (userData,temp_id) => {
    const template = await get_template_service(temp_id);
    if (!template || !template.pdfTemplateUrl) {
        throw new Error("No active certificate template found. Please set a template as active before generating.");
    }

    // Fetch the template PDF from S3/AWS
    const response = await axios.get(template.pdfTemplateUrl, { responseType: "arraybuffer" });
    const pdfDoc = await PDFDocument.load(response.data);

    const page = pdfDoc.getPages()[0];
    const { width, height } = page.getSize();
    const layout = template.textLayout || {};

    // ── Coordinate scaling ──────────────────────────────────────────────────
    const TEMPLATE_ASSUMED_W = 595;
    const TEMPLATE_ASSUMED_H = 842;
    const scaleX = width  / TEMPLATE_ASSUMED_W;
    const scaleY = height / TEMPLATE_ASSUMED_H;

    // fontScale matches frontend: overlayWidth/842 → use scaleX
    const fontScale = scaleX;

    // Helpers: stored pt coords → pdf-lib px (y is bottom-up, no flip needed)
    const drawX = (ptX) => Math.round(ptX * scaleX);
    const drawY = (ptY) => Math.round(ptY * scaleY);

    // ── Fonts ───────────────────────────────────────────────────────────────
    const font          = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont      = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const emphasizedFont = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
    const signatureFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
    const dynamicFont   = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);

    // ── Color resolver ──────────────────────────────────────────────────────
    const resolveColor = (colorName, fallback) => {
        const map = {
            dark:      rgb(0.1, 0.1, 0.1),
            lightDark: rgb(0.25, 0.25, 0.25),
            gray:      rgb(0.5, 0.5, 0.5),
            darkGray:  rgb(0.35, 0.35, 0.35),
        };
        return map[colorName] || fallback;
    };

    // ── Layout defaults ─────────────────────────────────────────────────────
    const DEFAULT_COLOR   = rgb(0, 0, 0);
    const namePosRaw      = layout.name       || { x: TEMPLATE_ASSUMED_W / 2, y: TEMPLATE_ASSUMED_H / 2,        size: 18 };
    const ageGroupPosRaw  = layout.ageGroup   || layout.field || { x: 120,                    y: TEMPLATE_ASSUMED_H / 2 - 40,   size: 14 };
    const clubPosRaw      = layout.clubName   || { x: 120,                    y: TEMPLATE_ASSUMED_H / 2 - 80,   size: 14 };
    const datePosRaw      = layout.issueDate  || { x: 80,                     y: 60,  size: 12 };
    const signaturePosRaw = layout.signature  || { x: 500,                    y: 60,  size: 12 };
    const tablePosRaw     = layout.eventTable || { x: 80,                     y: 330, width: 500 };


    // ── NAME (centre-aligned) ───────────────────────────────────────────────
    const nameText = String(userData.name || "");
    if (nameText) {
        const nameSize = (namePosRaw.size || 18) * fontScale;
        const nameW    = dynamicFont.widthOfTextAtSize(nameText, nameSize);
        page.drawText(nameText, {
            x: Math.round(drawX(namePosRaw.x) - nameW / 2),
            y: drawY(namePosRaw.y),
            size: nameSize,
            font: dynamicFont,
            color: resolveColor(namePosRaw.color, DEFAULT_COLOR),
        });
    }

    // ── AGE GROUP (left-aligned) ──────────────────────────────────────────
    const ageGroupText = String(userData.ageGroup || "");
    if (ageGroupText) {
        const ageGroupSize = (ageGroupPosRaw.size || 14) * fontScale;
         const ageGroupW    = dynamicFont.widthOfTextAtSize(ageGroupText, ageGroupSize);
        page.drawText(ageGroupText, {
            x: Math.round(drawX(ageGroupPosRaw.x)),
            y: drawY(ageGroupPosRaw.y),
            size: ageGroupSize,
            font: dynamicFont,
            color: resolveColor(ageGroupPosRaw.color, DEFAULT_COLOR),
        });
    }

    // ── CLUB NAME (left-aligned) ────────────────────────────────────────────
    const clubText = String(userData.clubName || "");
    if (clubText) {
        const clubSize = (clubPosRaw.size || 14) * fontScale;
         const clubW    = dynamicFont.widthOfTextAtSize(clubText, clubSize);
        page.drawText(clubText, {
            x: Math.round(drawX(clubPosRaw.x)),
            y: drawY(clubPosRaw.y),
            size: clubSize,
            font: dynamicFont,
            color: resolveColor(clubPosRaw.color, DEFAULT_COLOR),
        });
    }



    // ── ISSUE DATE (left-aligned) ───────────────────────────────────────────
    const dateText = String(userData.issueDate || "");
    if (dateText) {
        const dateSize = (datePosRaw.size || 12) * fontScale;
          const dateW    = dynamicFont.widthOfTextAtSize(dateText, dateSize);
        page.drawText(dateText, {
            x: Math.round(drawX(datePosRaw.x)),
            y: drawY(datePosRaw.y),
            size: dateSize,
            font: dynamicFont,
            color: resolveColor(datePosRaw.color, DEFAULT_COLOR),
        });
    }

    // ── SIGNATURE (left-aligned) ────────────────────────────────────────────
    const signatureText = String(layout?.signature?.text || "").trim().slice(0, 80);
    if (signatureText) {
        const sigSize  = (signaturePosRaw.size || 12) * fontScale;
        const sigX     = Math.round(drawX(signaturePosRaw.x));
        const sigY     = drawY(signaturePosRaw.y);
        const sigColor = resolveColor(signaturePosRaw.color, rgb(1, 0.66, 0));
        page.drawText(signatureText, { x: sigX + 1, y: sigY - 1, size: sigSize, font: signatureFont, color: sigColor, opacity: 0.35 });
        page.drawText(signatureText, { x: sigX,     y: sigY,     size: sigSize, font: signatureFont, color: sigColor });
    }

    // ── EVENT TABLE ─────────────────────────────────────────────────────────
    // Columns: EVENT 25% | DISCIPLINE 20% | DISTANCE 35% | PLACEMENT 20%
    const COL_RATIOS  = [0.25, 0.20, 0.35, 0.20];
    const HEADERS     = ["EVENT", "DISCIPLINE", "DISTANCE", "PLACEMENT"];

    /**
     * drawEventTable — draws a bordered table using pdf-lib primitives.
     *
     * @param {object[]} rows  - Array of { event, discipline, distance, placement }
     * @param {number}   startX   - Left edge of table in pdf-lib pts
     * @param {number}   topY     - TOP edge of table in pdf-lib pts (rows grow downward = decreasing Y)
     * @param {number}   tableW   - Total table width in pdf-lib pts
     * @param {number}   cellFontSz - Base font size for data rows
     */
    const drawEventTable = (rows, startX, topY, tableW, cellFontSz, tableColor) => {
        const headerFontSz = cellFontSz * 1.15;
        const rowH         = cellFontSz * 2.4;   // row height auto-calculated from font size
        const borderColor  = tableColor;
        const textColor    = tableColor;
        const colWidths    = COL_RATIOS.map((r) => tableW * r);

        const allRows = [
            { cells: HEADERS, isHeader: true },
            ...rows.map((r) => ({
                cells: [
                    String(r.event       || ""),
                    String(r.discipline  || ""),
                    String(r.distance    || ""),
                    String(r.placement   || ""),
                ],
                isHeader: false,
            })),
        ];

        allRows.forEach((row, rowIdx) => {
            const rowTopY    = topY - rowIdx * rowH;          // top edge of this row
            const rowBottomY = rowTopY - rowH;                 // bottom edge

            // Horizontal top/bottom borders for row
            page.drawLine({ start: { x: startX, y: rowTopY    }, end: { x: startX + tableW, y: rowTopY    }, thickness: 0.8, color: borderColor });
            page.drawLine({ start: { x: startX, y: rowBottomY }, end: { x: startX + tableW, y: rowBottomY }, thickness: 0.8, color: borderColor });

            let cellX = startX;
            row.cells.forEach((text, colIdx) => {
                const cellW = colWidths[colIdx];
                // Left border of each cell
                page.drawLine({ start: { x: cellX, y: rowTopY }, end: { x: cellX, y: rowBottomY }, thickness: 0.8, color: borderColor });

                // Font selection: Headers and first column (Event) are bold
                const fnt = row.isHeader || colIdx === 0 ? boldFont : dynamicFont;
                const fntSz = row.isHeader ? headerFontSz : cellFontSz;

                // Text — horizontally centred within cell, vertically centred in row
                const textW  = fnt.widthOfTextAtSize(text, fntSz);
                const textX  = cellX + Math.max(2, (cellW - textW) / 2);
                const textY  = rowBottomY + (rowH - fntSz) / 2;
                page.drawText(text, { x: Math.round(textX), y: Math.round(textY), size: fntSz, font: fnt, color: textColor });

                cellX += cellW;
            });
            // Right border of row
            page.drawLine({ start: { x: cellX, y: rowTopY }, end: { x: cellX, y: rowBottomY }, thickness: 0.8, color: borderColor });
        });
    };

    // Use dynamic events from userData if provided, otherwise fall back to static demo rows
    const tableRows = (Array.isArray(userData.events) && userData.events.length > 0)
        ? userData.events
        : [
            { event: "RINK - I",   discipline: "QUAD", distance: "1 LAP",                   placement: "" },
            { event: "RINK - II",  discipline: "QUAD", distance: "2 LAP / 500 +D",           placement: "" },
            { event: "RINK - III", discipline: "QUAD", distance: "3 LAPS / 4 LAPS / 1000M", placement: "" },
        ];

    drawEventTable(
        tableRows,
        drawX(tablePosRaw.x),
        drawY(tablePosRaw.y),
        drawX(tablePosRaw.width || 500),
        (tablePosRaw.size || 8) * fontScale,           // base font size, scaled
        resolveColor(tablePosRaw.color, DEFAULT_COLOR) // Table color
    );

    // ── Save & upload ───────────────────────────────────────────────────────
    const generatedPdfBytes = await pdfDoc.save();
    const fileToUpload = {
        buffer: Buffer.from(generatedPdfBytes),
        mimetype: "application/pdf",
        originalname: `certificate_${userData.winnerKRSAId}.pdf`,
    };
    const uploadRes = await putObject(fileToUpload, "certificates");

    return {
        winnerKRSAId: userData.winnerKRSAId,
        pdfUrl:       uploadRes.url,
        filename:     uploadRes.key || `certificates/certificate_${userData.winnerKRSAId}.pdf`,
    };
};

export {
    create_template_service,
    update_template_service,
    set_active_template_service,
    get_all_templates_service,
    get_template_service,
    get_template_by_id_service,
    generate_certificate_service,
};