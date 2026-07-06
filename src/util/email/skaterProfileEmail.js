import { getTransporter } from "../otp/emailOtp.js";
import { formatDob } from "../time/timeUtil.js";

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
        <td style="padding:11px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;width:42%;">${escapeHtml(label)}</td>
        <td style="padding:11px 16px;color:#0f172a;font-size:14px;font-weight:600;border-bottom:1px solid #f1f5f9;text-align:right;">${escapeHtml(value)}</td>
      </tr>`;
};

const buildSection = (title, rows) => {
    const content = rows.filter(Boolean).join("");
    if (!content) return "";
    return `
      <tr>
        <td style="padding:16px 32px 6px 32px;">
          <div style="color:#1a3fb0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">${escapeHtml(title)}</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            ${content}
          </table>
        </td>
      </tr>`;
};

const maskAadhar = (value) => {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits.length !== 12) return value || "";
    return `XXXX XXXX ${digits.slice(-4)}`;
};

const formatClubStatus = (status) => {
    const map = {
        apply: "Applied to club",
        join: "Joined club",
        "apply-leave": "Leave request pending",
        leave: "Left club",
        reject: "Club application rejected",
    };
    return map[String(status || "").toLowerCase()] || status || "";
};

const buildDocumentsSection = (documents = []) => {
    if (!Array.isArray(documents) || documents.length === 0) return "";

    const items = documents
        .map((doc, index) => {
            const name = doc?.name || `Document ${index + 1}`;
            const url = doc?.url || "";
            if (!url) return "";
            return `<li style="margin-bottom:6px;">
              <a href="${escapeHtml(url)}" style="color:#1a3fb0;text-decoration:none;font-size:13px;font-weight:600;">${escapeHtml(name)}</a>
            </li>`;
        })
        .filter(Boolean)
        .join("");

    if (!items) return "";

    return `
      <tr>
        <td style="padding:8px 32px 16px 32px;">
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px 18px;">
            <div style="color:#1e40af;font-size:13px;font-weight:700;margin-bottom:8px;">Uploaded Documents</div>
            <ul style="margin:0;padding-left:18px;">${items}</ul>
          </div>
        </td>
      </tr>`;
};

const buildSkaterProfileEmailHtml = (skater) => {
    const year = new Date().getFullYear();
    const firstName = escapeHtml((skater.fullName || "Skater").split(" ")[0]);
    const krsaId = skater.krsaId || "—";
    const photo = skater.photo || skater.profile || "";
    const categoryName = skater.category?.typeName || "";
    const disciplineName =
        skater.disciplineName ||
        skater.discipline?.name ||
        skater.discipline?.title ||
        "";
    const districtName = skater.district?.name || "";
    const clubName = skater.club?.name || "";
    const dob = skater.dob ? formatDob(skater.dob) : "";

    const personalRows = [
        buildDetailRow("Full Name", skater.fullName),
        buildDetailRow("Email", skater.email),
        buildDetailRow("Phone", skater.phone ? `+91 ${skater.phone}` : ""),
        buildDetailRow("Gender", skater.gender),
        buildDetailRow("Date of Birth", dob),
        buildDetailRow("Address", skater.address),
        buildDetailRow("Blood Group", skater.bloodGroup),
        buildDetailRow("Aadhaar", maskAadhar(skater.aadharNumber)),
    ];

    const skatingRows = [
        buildDetailRow("KRSA ID", krsaId),
        buildDetailRow("RSFI ID", skater.rsfiId),
        buildDetailRow("Category", categoryName),
        buildDetailRow("Discipline", disciplineName),
        buildDetailRow("Club Status", formatClubStatus(skater.clubStatus)),
        buildDetailRow(
            "Verification",
            skater.verify ? "Verified" : "Pending"
        ),
    ];

    const clubRows = [
        buildDetailRow("District", districtName),
        buildDetailRow("Club", clubName),
        buildDetailRow("Parent / Guardian", skater.parent),
    ];

    const educationRows = [
        buildDetailRow("School", skater.school),
        buildDetailRow("Grade", skater.grade),
    ];

    const photoBlock = photo
        ? `<tr>
        <td style="padding:8px 32px 4px 32px;text-align:center;">
          <img src="${escapeHtml(photo)}" alt="Profile photo" width="96" height="96" style="width:96px;height:96px;border-radius:50%;object-fit:cover;border:3px solid #93c5fd;" />
        </td>
      </tr>`
        : "";

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>KRSA Skater Profile</title>
  </head>
  <body style="margin:0;padding:0;background:#eef1f6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f6;padding:36px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(20,40,90,0.10);font-family:'Segoe UI',Arial,sans-serif;">

            <tr>
              <td style="background:linear-gradient(135deg,#1a3fb0 0%,#3b82f6 100%);padding:32px 32px 28px 32px;text-align:center;">
                <div style="width:56px;height:56px;background:rgba(255,255,255,0.15);border-radius:50%;margin:0 auto 14px auto;line-height:56px;font-size:28px;">🛼</div>
                <div style="color:#ffffff;font-size:24px;font-weight:800;letter-spacing:1px;">KRSA</div>
                <div style="color:#bfdbfe;font-size:12px;margin-top:4px;">Karnataka Roller Skating Association</div>
              </td>
            </tr>

            <tr>
              <td style="padding:28px 32px 0 32px;text-align:center;">
                <div style="display:inline-block;background:#f0fdf4;border:1px solid #86efac;border-radius:50px;padding:8px 20px;">
                  <span style="color:#16a34a;font-size:13px;font-weight:700;">✓ &nbsp;Profile Submitted Successfully</span>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 32px 8px 32px;text-align:center;">
                <h1 style="margin:0 0 8px 0;color:#0f172a;font-size:22px;font-weight:700;">Hi ${firstName}!</h1>
                <p style="margin:0;color:#64748b;font-size:14px;line-height:22px;">
                  Your skater profile has been saved. Here is a summary of your details.
                </p>
              </td>
            </tr>

            ${photoBlock}

            <tr>
              <td style="padding:16px 32px 8px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#eff6ff,#f0f9ff);border:2px solid #93c5fd;border-radius:14px;">
                  <tr>
                    <td style="padding:18px 24px;text-align:center;">
                      <div style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;font-weight:600;">Your KRSA ID</div>
                      <div style="color:#1a3fb0;font-size:28px;font-weight:900;letter-spacing:3px;font-family:'Courier New',monospace;">${escapeHtml(krsaId)}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            ${buildSection("Personal Information", personalRows)}
            ${buildSection("Skating Details", skatingRows)}
            ${buildSection("Club & District", clubRows)}
            ${buildSection("Education", educationRows)}
            ${buildDocumentsSection(skater.documents)}

            <tr>
              <td style="padding:8px 32px 24px 32px;">
                <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px 18px;text-align:center;">
                  <p style="margin:0;color:#9a3412;font-size:13px;line-height:20px;">
                    Keep this email for your records. Contact your club or KRSA support if any detail needs to be updated.
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

const buildSkaterProfileEmailText = (skater) => {
    const categoryName = skater.category?.typeName || "";
    const disciplineName =
        skater.disciplineName ||
        skater.discipline?.name ||
        skater.discipline?.title ||
        "";
    const districtName = skater.district?.name || "";
    const clubName = skater.club?.name || "";
    const dob = skater.dob ? formatDob(skater.dob) : "";

    const docLines = (skater.documents || [])
        .map((doc, i) => `  - ${doc?.name || `Document ${i + 1}`}: ${doc?.url || ""}`)
        .filter((line) => line.trim());

    return [
        `Hi ${skater.fullName || "Skater"}!`,
        "",
        "✓ Your skater profile has been submitted successfully.",
        "",
        `KRSA ID   : ${skater.krsaId || "—"}`,
        `RSFI ID   : ${skater.rsfiId || ""}`,
        `Email     : ${skater.email || ""}`,
        `Phone     : +91 ${skater.phone || ""}`,
        `Gender    : ${skater.gender || ""}`,
        dob ? `DOB       : ${dob}` : "",
        skater.address ? `Address   : ${skater.address}` : "",
        skater.bloodGroup ? `Blood Gr. : ${skater.bloodGroup}` : "",
        skater.aadharNumber ? `Aadhaar   : ${maskAadhar(skater.aadharNumber)}` : "",
        categoryName ? `Category  : ${categoryName}` : "",
        disciplineName ? `Discipline: ${disciplineName}` : "",
        districtName ? `District  : ${districtName}` : "",
        clubName ? `Club      : ${clubName}` : "",
        skater.clubStatus ? `Club Stat.: ${formatClubStatus(skater.clubStatus)}` : "",
        skater.parent ? `Parent    : ${skater.parent}` : "",
        skater.school ? `School    : ${skater.school}` : "",
        skater.grade ? `Grade     : ${skater.grade}` : "",
        `Verified  : ${skater.verify ? "Yes" : "No"}`,
        "",
        docLines.length ? "Documents:\n" + docLines.join("\n") : "",
        "",
        "Thank you for being part of KRSA!",
    ]
        .filter(Boolean)
        .join("\n");
};

export const sendSkaterProfileSubmittedEmail = async (skater) => {
    const to = String(skater?.email || "").trim().toLowerCase();
    if (!to) {
        return false;
    }

    await getTransporter().sendMail({
        from: `"KRSA" <${process.env.EMAIL_USER}>`,
        to,
        subject: `KRSA Profile Submitted — ${skater.krsaId || skater.fullName || "Skater"}`,
        text: buildSkaterProfileEmailText(skater),
        html: buildSkaterProfileEmailHtml(skater),
    });

    return true;
};
