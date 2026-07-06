import { getTransporter } from "../otp/emailOtp.js";

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

const buildSection = (title, rows, accent = "#c2410c") => {
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

const buildDocumentsBlock = (title, documents = [], accent, border, bg) => {
    if (!Array.isArray(documents) || documents.length === 0) return "";

    const items = documents
        .map((doc, index) => {
            const name = doc?.name || `Document ${index + 1}`;
            const url = doc?.url || "";
            if (!url) return "";
            return `<li style="margin-bottom:6px;">
              <a href="${escapeHtml(url)}" style="color:${accent};text-decoration:none;font-size:13px;font-weight:600;">${escapeHtml(name)}</a>
            </li>`;
        })
        .filter(Boolean)
        .join("");

    if (!items) return "";

    return `
      <tr>
        <td style="padding:8px 32px 4px 32px;">
          <div style="background:${bg};border:1px solid ${border};border-radius:12px;padding:16px 18px;">
            <div style="color:${accent};font-size:13px;font-weight:700;margin-bottom:8px;">${escapeHtml(title)}</div>
            <ul style="margin:0;padding-left:18px;">${items}</ul>
          </div>
        </td>
      </tr>`;
};

const buildClubProfileEmailHtml = (club) => {
    const year = new Date().getFullYear();
    const krsaId = club.krsaId || "—";
    const clubLabel = escapeHtml(club.clubName || club.fullName || "Club");
    const districtName = club.districtName || club.district?.name || "";
    const img = club.img || club.profile || "";

    const clubRows = [
        buildDetailRow("Club Name", club.clubName),
        buildDetailRow("ROS Number", club.ROSNumber),
        buildDetailRow("Registration Address", club.RegistrationAddress),
        buildDetailRow("District", districtName),
    ];

    const leadershipRows = [
        buildDetailRow("President", club.presidentName),
        buildDetailRow(
            "President Contact",
            club.presidentNumber ? `+91 ${club.presidentNumber}` : ""
        ),
        buildDetailRow("Secretary", club.secretaryName),
        buildDetailRow(
            "Secretary Contact",
            club.secretaryNumber ? `+91 ${club.secretaryNumber}` : ""
        ),
    ];

    const accountRows = [
        buildDetailRow("Contact Person", club.fullName),
        buildDetailRow("KRSA ID", krsaId),
        buildDetailRow("Email", club.email),
        buildDetailRow("Phone", club.phone ? `+91 ${club.phone}` : ""),
        buildDetailRow("Address", club.address),
        buildDetailRow("Verification", club.verify ? "Verified" : "Pending"),
    ];

    const skaterCountRows = [
        buildDetailRow("Tenacity Skaters", club.tenacitySkaters),
        buildDetailRow("Recreational Skaters", club.recreationalSkaters),
        buildDetailRow("Quad Skaters", club.QuadSkaters),
        buildDetailRow("Pro Inline Skaters", club.ProInlineSkaters),
    ];

    const trackRows = [
        buildDetailRow("Track Address", club.trackAddress),
        buildDetailRow("Track Measurements", club.trackMeasurements),
        buildDetailRow("Number of Trainers", club.noOfTrainers),
        buildDetailRow("Trainer Certification", club.trainerCertification),
    ];

    const imgBlock = img
        ? `<tr>
        <td style="padding:8px 32px 4px 32px;text-align:center;">
          <img src="${escapeHtml(img)}" alt="Club logo" width="96" height="96" style="width:96px;height:96px;border-radius:12px;object-fit:cover;border:3px solid #fdba74;" />
        </td>
      </tr>`
        : "";

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>KRSA Club Profile</title>
  </head>
  <body style="margin:0;padding:0;background:#eef1f6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f6;padding:36px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(20,40,90,0.10);font-family:'Segoe UI',Arial,sans-serif;">

            <tr>
              <td style="background:linear-gradient(135deg,#c2410c 0%,#f97316 100%);padding:32px 32px 28px 32px;text-align:center;">
                <div style="width:56px;height:56px;background:rgba(255,255,255,0.15);border-radius:50%;margin:0 auto 14px auto;line-height:56px;font-size:28px;">🏆</div>
                <div style="color:#ffffff;font-size:24px;font-weight:800;letter-spacing:1px;">KRSA</div>
                <div style="color:#ffedd5;font-size:12px;margin-top:4px;">Karnataka Roller Skating Association</div>
              </td>
            </tr>

            <tr>
              <td style="padding:28px 32px 0 32px;text-align:center;">
                <div style="display:inline-block;background:#fff7ed;border:1px solid #fdba74;border-radius:50px;padding:8px 20px;">
                  <span style="color:#c2410c;font-size:13px;font-weight:700;">✓ &nbsp;Club Profile Submitted</span>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 32px 8px 32px;text-align:center;">
                <h1 style="margin:0 0 8px 0;color:#0f172a;font-size:22px;font-weight:700;">${clubLabel}</h1>
                <p style="margin:0;color:#64748b;font-size:14px;line-height:22px;">
                  Your club/academy profile has been saved successfully.<br />
                  Here is a summary of your submitted details.
                </p>
              </td>
            </tr>

            ${imgBlock}

            <tr>
              <td style="padding:16px 32px 8px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#fff7ed,#ffedd5);border:2px solid #fdba74;border-radius:14px;">
                  <tr>
                    <td style="padding:18px 24px;text-align:center;">
                      <div style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;font-weight:600;">Your KRSA ID</div>
                      <div style="color:#c2410c;font-size:28px;font-weight:900;letter-spacing:3px;font-family:'Courier New',monospace;">${escapeHtml(krsaId)}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            ${buildSection("Club Information", clubRows)}
            ${buildSection("Leadership", leadershipRows)}
            ${buildSection("Account Contact", accountRows)}
            ${buildSection("Skater Counts", skaterCountRows)}
            ${buildSection("Track & Training", trackRows)}
            ${buildDocumentsBlock("Club Documents", club.documents, "#c2410c", "#fdba74", "#fff7ed")}
            ${buildDocumentsBlock("ROS Documents", club.rosDocuments, "#9a3412", "#fed7aa", "#fffbeb")}

            <tr>
              <td style="padding:12px 32px 24px 32px;">
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

const buildClubProfileEmailText = (club) => {
    const districtName = club.districtName || club.district?.name || "";

    const docLines = (club.documents || []).map(
        (doc, i) => `  Club Doc ${i + 1}: ${doc?.name || "File"} — ${doc?.url || ""}`
    );
    const rosLines = (club.rosDocuments || []).map(
        (doc, i) => `  ROS Doc ${i + 1}: ${doc?.name || "File"} — ${doc?.url || ""}`
    );

    return [
        "KRSA — Club Profile Submitted",
        "",
        `Club: ${club.clubName || club.fullName || ""}`,
        "",
        "✓ Your club/academy profile has been saved successfully.",
        "",
        `KRSA ID              : ${club.krsaId || "—"}`,
        `Club Name            : ${club.clubName || ""}`,
        `ROS Number           : ${club.ROSNumber || ""}`,
        `Registration Address : ${club.RegistrationAddress || ""}`,
        districtName ? `District             : ${districtName}` : "",
        `President            : ${club.presidentName || ""}`,
        club.presidentNumber ? `President Contact    : +91 ${club.presidentNumber}` : "",
        `Secretary            : ${club.secretaryName || ""}`,
        club.secretaryNumber ? `Secretary Contact    : +91 ${club.secretaryNumber}` : "",
        `Contact Person       : ${club.fullName || ""}`,
        `Email                : ${club.email || ""}`,
        `Phone                : +91 ${club.phone || ""}`,
        club.address ? `Address              : ${club.address}` : "",
        club.tenacitySkaters ? `Tenacity Skaters     : ${club.tenacitySkaters}` : "",
        club.recreationalSkaters ? `Recreational Skaters : ${club.recreationalSkaters}` : "",
        club.QuadSkaters ? `Quad Skaters         : ${club.QuadSkaters}` : "",
        club.ProInlineSkaters ? `Pro Inline Skaters   : ${club.ProInlineSkaters}` : "",
        club.trackAddress ? `Track Address        : ${club.trackAddress}` : "",
        club.noOfTrainers ? `Trainers             : ${club.noOfTrainers}` : "",
        `Verified             : ${club.verify ? "Yes" : "No"}`,
        "",
        docLines.length ? "Club Documents:\n" + docLines.join("\n") : "",
        rosLines.length ? "ROS Documents:\n" + rosLines.join("\n") : "",
        "",
        "Thank you for partnering with KRSA!",
    ]
        .filter(Boolean)
        .join("\n");
};

export const sendClubProfileSubmittedEmail = async (club) => {
    const to = String(club?.email || "").trim().toLowerCase();
    if (!to) {
        return false;
    }

    await getTransporter().sendMail({
        from: `"KRSA" <${process.env.EMAIL_USER}>`,
        to,
        subject: `KRSA Club Profile Submitted — ${club.krsaId || club.clubName || "Club"}`,
        text: buildClubProfileEmailText(club),
        html: buildClubProfileEmailHtml(club),
    });

    return true;
};
