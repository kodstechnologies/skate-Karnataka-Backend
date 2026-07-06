import { getTransporter } from "../otp/emailOtp.js";
import { formatDob } from "../time/timeUtil.js";
import mongoose from "mongoose";
import { District } from "../../modules/district/district.model.js";

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

const buildSection = (title, rows, accent = "#be185d") => {
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

const formatDobValue = (value) => {
    if (!value) return "";
    try {
        return formatDob(value);
    } catch {
        return String(value);
    }
};

const buildSkaterCards = (skaters = []) => {
    if (!Array.isArray(skaters) || skaters.length === 0) {
        return `
      <tr>
        <td style="padding:8px 32px 16px 32px;">
          <div style="background:#fdf2f8;border:1px solid #fbcfe8;border-radius:12px;padding:16px 18px;text-align:center;">
            <p style="margin:0;color:#9d174d;font-size:13px;">No skater profiles linked yet.</p>
          </div>
        </td>
      </tr>`;
    }

    const cards = skaters
        .map((skater, index) => {
            const photo = skater.photo || skater.profile || "";
            const photoBlock = photo
                ? `<img src="${escapeHtml(photo)}" alt="Skater" width="48" height="48" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid #f9a8d4;margin-right:12px;vertical-align:middle;" />`
                : `<div style="display:inline-block;width:48px;height:48px;border-radius:50%;background:#fce7f3;color:#be185d;text-align:center;line-height:48px;font-size:20px;margin-right:12px;vertical-align:middle;">🛼</div>`;

            return `
          <div style="background:#ffffff;border:1px solid #fbcfe8;border-radius:12px;padding:14px 16px;margin-bottom:10px;">
            <div style="margin-bottom:10px;">
              ${photoBlock}
              <span style="color:#0f172a;font-size:15px;font-weight:700;vertical-align:middle;">${escapeHtml(skater.fullName || `Skater ${index + 1}`)}</span>
            </div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${buildDetailRow("KRSA ID", skater.krsaId)}
              ${buildDetailRow("RSFI ID", skater.rsfiId)}
              ${buildDetailRow("Date of Birth", formatDobValue(skater.dob))}
              ${buildDetailRow("Phone", skater.phone ? `+91 ${skater.phone}` : "")}
              ${buildDetailRow("Email", skater.email)}
              ${buildDetailRow("Gender", skater.gender)}
              ${buildDetailRow("Verified", skater.verify ? "Yes" : "No")}
            </table>
          </div>`;
        })
        .join("");

    return `
      <tr>
        <td style="padding:8px 32px 16px 32px;">
          <div style="color:#be185d;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Linked Skaters (${skaters.length})</div>
          ${cards}
        </td>
      </tr>`;
};

const buildParentProfileEmailHtml = (parent) => {
    const year = new Date().getFullYear();
    const krsaId = parent.krsaId || "—";
    const firstName = escapeHtml((parent.fullName || "Parent").split(" ")[0]);
    const districtName = parent.districtName || "";
    const profileImg = parent.profile || "";

    const parentRows = [
        buildDetailRow("Full Name", parent.fullName),
        buildDetailRow("KRSA ID", krsaId),
        buildDetailRow("Email", parent.email),
        buildDetailRow("Phone", parent.phone ? `+91 ${parent.phone}` : ""),
        buildDetailRow("Gender", parent.gender),
        buildDetailRow("Address", parent.address),
        buildDetailRow("District", districtName),
        buildDetailRow("Verification", parent.verify ? "Verified" : "Pending"),
    ];

    const imgBlock = profileImg
        ? `<tr>
        <td style="padding:8px 32px 4px 32px;text-align:center;">
          <img src="${escapeHtml(profileImg)}" alt="Profile" width="88" height="88" style="width:88px;height:88px;border-radius:50%;object-fit:cover;border:3px solid #f9a8d4;" />
        </td>
      </tr>`
        : "";

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>KRSA Parent Profile</title>
  </head>
  <body style="margin:0;padding:0;background:#eef1f6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f6;padding:36px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(20,40,90,0.10);font-family:'Segoe UI',Arial,sans-serif;">

            <tr>
              <td style="background:linear-gradient(135deg,#be185d 0%,#ec4899 100%);padding:32px 32px 28px 32px;text-align:center;">
                <div style="width:56px;height:56px;background:rgba(255,255,255,0.15);border-radius:50%;margin:0 auto 14px auto;line-height:56px;font-size:28px;">👨‍👩‍👧</div>
                <div style="color:#ffffff;font-size:24px;font-weight:800;letter-spacing:1px;">KRSA</div>
                <div style="color:#fce7f3;font-size:12px;margin-top:4px;">Karnataka Roller Skating Association</div>
              </td>
            </tr>

            <tr>
              <td style="padding:28px 32px 0 32px;text-align:center;">
                <div style="display:inline-block;background:#fdf2f8;border:1px solid #f9a8d4;border-radius:50px;padding:8px 20px;">
                  <span style="color:#be185d;font-size:13px;font-weight:700;">✓ &nbsp;Parent Profile Submitted</span>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 32px 8px 32px;text-align:center;">
                <h1 style="margin:0 0 8px 0;color:#0f172a;font-size:22px;font-weight:700;">Hi ${firstName}!</h1>
                <p style="margin:0;color:#64748b;font-size:14px;line-height:22px;">
                  Your parent profile has been saved successfully.<br />
                  Below are your details and linked skater profiles.
                </p>
              </td>
            </tr>

            ${imgBlock}

            <tr>
              <td style="padding:16px 32px 8px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#fdf2f8,#fce7f3);border:2px solid #f9a8d4;border-radius:14px;">
                  <tr>
                    <td style="padding:18px 24px;text-align:center;">
                      <div style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;font-weight:600;">Your KRSA ID</div>
                      <div style="color:#be185d;font-size:28px;font-weight:900;letter-spacing:3px;font-family:'Courier New',monospace;">${escapeHtml(krsaId)}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            ${buildSection("Parent Information", parentRows)}
            ${buildSkaterCards(parent.skaters)}

            <tr>
              <td style="padding:8px 32px 24px 32px;">
                <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px 18px;text-align:center;">
                  <p style="margin:0;color:#9a3412;font-size:13px;line-height:20px;">
                    You can manage your skater profiles from the KRSA app. Contact support if any detail needs updating.
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

const buildParentProfileEmailText = (parent) => {
    const districtName = parent.districtName || "";
    const skaterLines = (parent.skaters || []).flatMap((skater, index) => [
        `Skater ${index + 1}: ${skater.fullName || ""}`,
        skater.krsaId ? `  KRSA ID : ${skater.krsaId}` : "",
        skater.rsfiId ? `  RSFI ID : ${skater.rsfiId}` : "",
        skater.dob ? `  DOB     : ${formatDobValue(skater.dob)}` : "",
        skater.phone ? `  Phone   : +91 ${skater.phone}` : "",
        skater.email ? `  Email   : ${skater.email}` : "",
        `  Verified: ${skater.verify ? "Yes" : "No"}`,
        "",
    ]);

    return [
        `Hi ${parent.fullName || "Parent"}!`,
        "",
        "✓ Your parent profile has been submitted successfully.",
        "",
        `KRSA ID  : ${parent.krsaId || "—"}`,
        `Email    : ${parent.email || ""}`,
        `Phone    : +91 ${parent.phone || ""}`,
        parent.gender ? `Gender   : ${parent.gender}` : "",
        parent.address ? `Address  : ${parent.address}` : "",
        districtName ? `District : ${districtName}` : "",
        `Verified : ${parent.verify ? "Yes" : "No"}`,
        "",
        (parent.skaters || []).length
            ? "Linked Skaters:\n" + skaterLines.filter(Boolean).join("\n")
            : "No skater profiles linked yet.",
        "",
        "Thank you for being part of KRSA!",
    ]
        .filter(Boolean)
        .join("\n");
};

const resolveDistrictName = async (districtId) => {
    if (!districtId || !mongoose.Types.ObjectId.isValid(String(districtId))) {
        return "";
    }
    const district = await District.findById(districtId).select("name").lean();
    return district?.name || "";
};

export const sendParentProfileSubmittedEmail = async (parent) => {
    const to = String(parent?.email || "").trim().toLowerCase();
    if (!to) {
        return false;
    }

    const districtName = parent.districtName || (await resolveDistrictName(parent.district));
    const payload = { ...parent, districtName };

    await getTransporter().sendMail({
        from: `"KRSA" <${process.env.EMAIL_USER}>`,
        to,
        subject: `KRSA Parent Profile Submitted — ${parent.krsaId || parent.fullName || "Parent"}`,
        text: buildParentProfileEmailText(payload),
        html: buildParentProfileEmailHtml(payload),
    });

    return true;
};
