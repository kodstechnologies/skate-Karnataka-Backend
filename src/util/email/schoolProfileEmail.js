import { getTransporter } from "../otp/emailOtp.js";
import { formatDate } from "../time/timeUtil.js";

const escapeHtml = (value) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

const buildDetailRow = (label, value) => {
    if (value === undefined || value === null || value === "") return "";
    return `
      <tr>
        <td style="padding:11px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;width:44%;">${escapeHtml(label)}</td>
        <td style="padding:11px 16px;color:#0f172a;font-size:14px;font-weight:600;border-bottom:1px solid #f1f5f9;text-align:right;">${escapeHtml(value)}</td>
      </tr>`;
};

const buildSection = (title, rows, accent = "#6d28d9") => {
    const content = rows.filter(Boolean).join("");
    if (!content) return "";
    return `
      <tr>
        <td style="padding:16px 32px 6px 32px;">
          <div style="color:${accent};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">${escapeHtml(title)}</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            ${content}
          </table>
        </td>
      </tr>`;
};

const formatDateValue = (value) => {
    if (!value) return "";
    try {
        return formatDate(value);
    } catch {
        return String(value);
    }
};

const isImageUrl = (url) =>
    /\.(jpe?g|png|gif|webp|bmp|svg)(\?|#|$)/i.test(String(url || "")) ||
    /\/image\//i.test(String(url || ""));

const mergeSchoolUploads = (school, submission = {}) => {
    const documents = [...(school?.documents || [])];
    const seenUrls = new Set(
        documents.map((doc) => String(doc?.url || "").trim()).filter(Boolean)
    );

    const submittedDocs = Array.isArray(submission.submittedDocuments)
        ? submission.submittedDocuments
        : [];

    for (const doc of submittedDocs) {
        const url = typeof doc === "string" ? doc.trim() : String(doc?.url || "").trim();
        if (!url || seenUrls.has(url)) continue;
        seenUrls.add(url);
        documents.push(
            typeof doc === "object" && doc !== null
                ? doc
                : { url, name: "Uploaded Document", uploadedAt: new Date() }
        );
    }

    const img = submission.submittedImg || school?.img || school?.profile || "";

    return {
        ...school,
        img,
        documents,
    };
};

const collectSchoolUploads = (school) => {
    const uploads = [];
    const seen = new Set();

    const addUpload = (name, url, uploadedAt) => {
        const normalizedUrl = String(url || "").trim();
        if (!normalizedUrl || seen.has(normalizedUrl)) return;
        seen.add(normalizedUrl);
        uploads.push({
            name: name || "Uploaded File",
            url: normalizedUrl,
            uploadedAt,
            isImage: isImageUrl(normalizedUrl),
        });
    };

    addUpload("School Logo / Image", school.img || school.profile);

    (school.documents || []).forEach((doc, index) => {
        addUpload(
            doc?.name || `Document ${index + 1}`,
            doc?.url,
            doc?.uploadedAt
        );
    });

    return uploads;
};

const buildUploadCard = (upload, index) => {
    const label = escapeHtml(upload.name || `File ${index + 1}`);
    const url = escapeHtml(upload.url);
    const uploadedAt = upload.uploadedAt
        ? formatDateValue(upload.uploadedAt)
        : "";

    const preview = upload.isImage
        ? `<a href="${url}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
            <img src="${url}" alt="${label}" width="100%" style="display:block;width:100%;max-width:220px;height:140px;object-fit:cover;border-radius:10px;border:1px solid #e2e8f0;margin:0 auto 10px auto;" />
          </a>`
        : `<a href="${url}" target="_blank" rel="noopener noreferrer" style="display:block;width:100%;max-width:220px;height:140px;margin:0 auto 10px auto;background:#f8fafc;border:1px dashed #c4b5fd;border-radius:10px;text-align:center;line-height:140px;text-decoration:none;font-size:42px;">📄</a>`;

    return `
      <td width="50%" style="padding:8px;vertical-align:top;">
        <div style="background:#ffffff;border:1px solid #e9d5ff;border-radius:12px;padding:14px;text-align:center;height:100%;">
          ${preview}
          <div style="color:#0f172a;font-size:13px;font-weight:700;margin-bottom:4px;">${label}</div>
          <a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#6d28d9;font-size:12px;font-weight:600;text-decoration:none;word-break:break-all;">View / Download</a>
          ${uploadedAt ? `<div style="color:#94a3b8;font-size:11px;margin-top:6px;">Uploaded: ${escapeHtml(uploadedAt)}</div>` : ""}
        </div>
      </td>`;
};

const buildDocumentsSection = (school) => {
    const uploads = collectSchoolUploads(school);
    if (!uploads.length) return "";

    const rows = [];
    for (let i = 0; i < uploads.length; i += 2) {
        const left = buildUploadCard(uploads[i], i);
        const right = uploads[i + 1] ? buildUploadCard(uploads[i + 1], i + 1) : '<td width="50%" style="padding:8px;"></td>';
        rows.push(`<tr>${left}${right}</tr>`);
    }

    return `
      <tr>
        <td style="padding:8px 24px 16px 24px;">
          <div style="background:#f5f3ff;border:1px solid #c4b5fd;border-radius:12px;padding:16px 12px 8px 12px;">
            <div style="color:#5b21b6;font-size:13px;font-weight:700;margin-bottom:12px;text-align:center;">
              Uploaded Files (${uploads.length})
            </div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${rows.join("")}
            </table>
          </div>
        </td>
      </tr>`;
};

const buildSchoolProfileEmailHtml = (school) => {
    const year = new Date().getFullYear();
    const krsaId = school.krsaId || "—";
    const schoolLabel = escapeHtml(school.schoolName || school.fullName || "School");
    const districtName = school.districtName || school.district?.name || "";

    const schoolRows = [
        buildDetailRow("School Name", school.schoolName),
        buildDetailRow("Board", school.board),
        buildDetailRow("Principal Name", school.principalName),
        buildDetailRow("School Email", school.schoolEmail),
        buildDetailRow(
            "School Contact",
            school.schoolContactNumber || school.schoolContact
                ? `+91 ${school.schoolContactNumber || school.schoolContact}`
                : ""
        ),
        buildDetailRow("Serving From", formatDateValue(school.servingFrom)),
        buildDetailRow("Certificates Available", school.certificatesAvailable),
        buildDetailRow("Certified By", school.certifiedBy),
    ];

    const accountRows = [
        buildDetailRow("Contact Person", school.fullName),
        buildDetailRow("KRSA ID", krsaId),
        buildDetailRow("Account Email", school.email),
        buildDetailRow("Phone", school.phone ? `+91 ${school.phone}` : ""),
        buildDetailRow("Address", school.address),
        buildDetailRow("District", districtName),
        buildDetailRow("Verification", school.verify ? "Verified" : "Pending"),
    ];

    const skatingRows = [
        buildDetailRow("Skating Infrastructure", school.skatingInfraAvailable),
        buildDetailRow("Infrastructure Details", school.skatingInfraInfo),
        buildDetailRow("Looking for Skating Service", school.lookingForSkatingService),
        buildDetailRow("Looking for Skating Coach", school.lookingForSkatingCoach),
        buildDetailRow("Coach Info", school.skatingCoachInfo),
    ];

    const coachRows = [
        buildDetailRow("Coach Name", school.coachName),
        buildDetailRow("Coach Gender", school.coachGender),
        buildDetailRow(
            "Coach Contact",
            school.coachContact ? `+91 ${school.coachContact}` : ""
        ),
        buildDetailRow("Coach Certificates", school.coachCertificates),
        buildDetailRow("Coach Joining Date", formatDateValue(school.coachJoiningDate)),
    ];

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>KRSA School Profile</title>
  </head>
  <body style="margin:0;padding:0;background:#eef1f6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f6;padding:36px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(20,40,90,0.10);font-family:'Segoe UI',Arial,sans-serif;">

            <tr>
              <td style="background:linear-gradient(135deg,#5b21b6 0%,#8b5cf6 100%);padding:32px 32px 28px 32px;text-align:center;">
                <div style="width:56px;height:56px;background:rgba(255,255,255,0.15);border-radius:50%;margin:0 auto 14px auto;line-height:56px;font-size:28px;">🏫</div>
                <div style="color:#ffffff;font-size:24px;font-weight:800;letter-spacing:1px;">KRSA</div>
                <div style="color:#ddd6fe;font-size:12px;margin-top:4px;">Karnataka Roller Skating Association</div>
              </td>
            </tr>

            <tr>
              <td style="padding:28px 32px 0 32px;text-align:center;">
                <div style="display:inline-block;background:#f5f3ff;border:1px solid #c4b5fd;border-radius:50px;padding:8px 20px;">
                  <span style="color:#6d28d9;font-size:13px;font-weight:700;">✓ &nbsp;School Profile Submitted</span>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 32px 8px 32px;text-align:center;">
                <h1 style="margin:0 0 8px 0;color:#0f172a;font-size:22px;font-weight:700;">${schoolLabel}</h1>
                <p style="margin:0;color:#64748b;font-size:14px;line-height:22px;">
                  Your school profile has been saved successfully.<br />
                  Here is a summary of your submitted details.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:16px 32px 8px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#f5f3ff,#ede9fe);border:2px solid #c4b5fd;border-radius:14px;">
                  <tr>
                    <td style="padding:18px 24px;text-align:center;">
                      <div style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;font-weight:600;">Your KRSA ID</div>
                      <div style="color:#5b21b6;font-size:28px;font-weight:900;letter-spacing:3px;font-family:'Courier New',monospace;">${escapeHtml(krsaId)}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            ${buildSection("School Information", schoolRows)}
            ${buildSection("Account Contact", accountRows)}
            ${buildSection("Skating Infrastructure", skatingRows)}
            ${buildSection("Coach Details", coachRows)}
            ${buildDocumentsSection(school)}

            <tr>
              <td style="padding:8px 32px 24px 32px;">
                <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px 18px;text-align:center;">
                  <p style="margin:0;color:#9a3412;font-size:13px;line-height:20px;">
                    Keep this email for your records. Contact KRSA support if any detail needs to be updated.
                  </p>
                </div>
              </td>
            </tr>

            <tr>
              <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;">
                <p style="margin:0;color:#94a3b8;font-size:12px;line-height:20px;">
                  &copy; ${year} Karnataka Roller Skating Association. All rights reserved.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

const buildSchoolProfileEmailText = (school) => {
    const districtName = school.districtName || school.district?.name || "";

    return [
        `KRSA — School Profile Submitted`,
        "",
        `School: ${school.schoolName || school.fullName || ""}`,
        "",
        "✓ Your school profile has been saved successfully.",
        "",
        `KRSA ID         : ${school.krsaId || "—"}`,
        `School Name     : ${school.schoolName || ""}`,
        `Board           : ${school.board || ""}`,
        `Principal       : ${school.principalName || ""}`,
        `School Email    : ${school.schoolEmail || ""}`,
        school.schoolContactNumber || school.schoolContact
            ? `School Contact  : +91 ${school.schoolContactNumber || school.schoolContact}`
            : "",
        school.servingFrom ? `Serving From    : ${formatDateValue(school.servingFrom)}` : "",
        `Contact Person  : ${school.fullName || ""}`,
        `Account Email   : ${school.email || ""}`,
        `Phone           : +91 ${school.phone || ""}`,
        school.address ? `Address         : ${school.address}` : "",
        districtName ? `District        : ${districtName}` : "",
        school.skatingInfraAvailable ? `Skating Infra   : ${school.skatingInfraAvailable}` : "",
        school.lookingForSkatingService ? `Skating Service : ${school.lookingForSkatingService}` : "",
        school.lookingForSkatingCoach ? `Skating Coach   : ${school.lookingForSkatingCoach}` : "",
        school.coachName ? `Coach Name      : ${school.coachName}` : "",
        `Verified        : ${school.verify ? "Yes" : "No"}`,
        "",
        ...collectSchoolUploads(school).map(
            (upload, i) => `${upload.name || `File ${i + 1}`}: ${upload.url}`
        ),
        "",
        "Thank you for partnering with KRSA!",
    ]
        .filter(Boolean)
        .join("\n");
};

export const sendSchoolProfileSubmittedEmail = async (school, submission = {}) => {
    const to = String(school?.email || school?.schoolEmail || "").trim().toLowerCase();
    if (!to) {
        return false;
    }

    const mergedSchool = mergeSchoolUploads(school, submission);

    await getTransporter().sendMail({
        from: `"KRSA" <${process.env.EMAIL_USER}>`,
        to,
        subject: `KRSA School Profile Submitted — ${mergedSchool.krsaId || mergedSchool.schoolName || "School"}`,
        text: buildSchoolProfileEmailText(mergedSchool),
        html: buildSchoolProfileEmailHtml(mergedSchool),
    });

    return true;
};
