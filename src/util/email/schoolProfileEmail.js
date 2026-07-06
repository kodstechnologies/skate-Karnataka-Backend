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

const buildDocumentsSection = (documents = []) => {
    if (!Array.isArray(documents) || documents.length === 0) return "";

    const items = documents
        .map((doc, index) => {
            const name = doc?.name || `Document ${index + 1}`;
            const url = doc?.url || "";
            if (!url) return "";
            return `<li style="margin-bottom:6px;">
              <a href="${escapeHtml(url)}" style="color:#6d28d9;text-decoration:none;font-size:13px;font-weight:600;">${escapeHtml(name)}</a>
            </li>`;
        })
        .filter(Boolean)
        .join("");

    if (!items) return "";

    return `
      <tr>
        <td style="padding:8px 32px 16px 32px;">
          <div style="background:#f5f3ff;border:1px solid #c4b5fd;border-radius:12px;padding:16px 18px;">
            <div style="color:#5b21b6;font-size:13px;font-weight:700;margin-bottom:8px;">Uploaded Documents</div>
            <ul style="margin:0;padding-left:18px;">${items}</ul>
          </div>
        </td>
      </tr>`;
};

const buildSchoolProfileEmailHtml = (school) => {
    const year = new Date().getFullYear();
    const krsaId = school.krsaId || "—";
    const schoolLabel = escapeHtml(school.schoolName || school.fullName || "School");
    const districtName = school.districtName || school.district?.name || "";
    const img = school.img || school.profile || "";

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

    const imgBlock = img
        ? `<tr>
        <td style="padding:8px 32px 4px 32px;text-align:center;">
          <img src="${escapeHtml(img)}" alt="School image" width="96" height="96" style="width:96px;height:96px;border-radius:12px;object-fit:cover;border:3px solid #c4b5fd;" />
        </td>
      </tr>`
        : "";

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

            ${imgBlock}

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
            ${buildDocumentsSection(school.documents)}

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
        ...(school.documents || []).map(
            (doc, i) => `Document ${i + 1}: ${doc?.name || "File"} — ${doc?.url || ""}`
        ),
        "",
        "Thank you for partnering with KRSA!",
    ]
        .filter(Boolean)
        .join("\n");
};

export const sendSchoolProfileSubmittedEmail = async (school) => {
    const to = String(school?.email || school?.schoolEmail || "").trim().toLowerCase();
    if (!to) {
        return false;
    }

    await getTransporter().sendMail({
        from: `"KRSA" <${process.env.EMAIL_USER}>`,
        to,
        subject: `KRSA School Profile Submitted — ${school.krsaId || school.schoolName || "School"}`,
        text: buildSchoolProfileEmailText(school),
        html: buildSchoolProfileEmailHtml(school),
    });

    return true;
};
