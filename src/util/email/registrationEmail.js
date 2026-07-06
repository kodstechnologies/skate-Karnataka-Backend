import { getTransporter } from "../otp/emailOtp.js";

const escapeHtml = (value) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

const formatLabel = (key) =>
    String(key)
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (c) => c.toUpperCase())
        .trim();

const ROLE_UPLOAD_GUIDE = {
    Skater: {
        summary: "Complete your skater profile after logging in to the KRSA app.",
        imageUploads: [
            { formField: "img", storedAs: "photo", description: "Profile photo" },
        ],
        documentUploads: [
            { formField: "document", storedAs: "documents", description: "Supporting documents (Aadhaar, certificates, etc.) — up to 10 files" },
        ],
        profileFields: [
            "Date of birth",
            "Aadhaar number",
            "RSFI ID",
            "Category & discipline",
            "Blood group",
            "School & grade",
            "Parent details",
            "Signature",
        ],
    },
    Parent: {
        summary: "Your parent account is ready. You can link and manage skater profiles from the app after login.",
        imageUploads: [],
        documentUploads: [],
        profileFields: ["Link skater accounts", "Update contact details"],
    },
    School: {
        summary: "Complete your school profile and upload required documents after logging in.",
        imageUploads: [
            { formField: "img", storedAs: "img", description: "School logo or representative image" },
        ],
        documentUploads: [
            { formField: "document / documentFile", storedAs: "documents", description: "School registration & certification documents" },
        ],
        profileFields: [
            "School name & board",
            "Principal name",
            "School email & contact",
            "Skating infrastructure details",
            "Coach information",
        ],
    },
    Academy: {
        summary: "Complete your academy/club profile and upload club documents after logging in.",
        imageUploads: [
            { formField: "img", storedAs: "img", description: "Club/academy logo or photo" },
        ],
        documentUploads: [
            { formField: "document / documents", storedAs: "documents", description: "Club registration documents" },
            { formField: "rosDocument / rosDocuments", storedAs: "rosDocuments", description: "ROS (Register of Society) documents" },
        ],
        profileFields: [
            "Club name & ROS number",
            "President & secretary details",
            "Track address & measurements",
            "Trainer count & certification",
            "Skater counts by discipline",
        ],
    },
    Official: {
        summary: "Complete your official profile and upload credentials after logging in.",
        imageUploads: [
            { formField: "img", storedAs: "img", description: "Profile photo" },
        ],
        documentUploads: [
            { formField: "document / documents", storedAs: "documents", description: "Coaching/officiating certificates & ID proofs" },
        ],
        profileFields: [
            "Experience & training courses",
            "Coaching & officiating details",
            "Official contact & email",
        ],
    },
    Guest: {
        summary: "Your guest account is active. Explore KRSA events and services from the app.",
        imageUploads: [],
        documentUploads: [],
        profileFields: ["Areas of interest", "Contact details"],
    },
    District: {
        summary: "Your district account is registered. Manage district members and events from the admin portal.",
        imageUploads: [],
        documentUploads: [],
        profileFields: ["District assignment", "Member management"],
    },
};

const getUploadGuide = (role) =>
    ROLE_UPLOAD_GUIDE[role] || {
        summary: "Log in to the KRSA app to complete your profile.",
        imageUploads: [],
        documentUploads: [],
        profileFields: [],
    };

const buildDetailRow = (label, value) => {
    if (value === undefined || value === null || value === "") return "";
    return `
      <tr>
        <td style="padding:10px 0;color:#64748b;font-size:13px;width:38%;vertical-align:top;">${escapeHtml(label)}</td>
        <td style="padding:10px 0;color:#0f172a;font-size:14px;font-weight:600;vertical-align:top;">${escapeHtml(value)}</td>
      </tr>`;
};

const buildUploadList = (items, accentColor) =>
    items.length
        ? `<ul style="margin:8px 0 0 0;padding-left:18px;color:#334155;font-size:13px;line-height:22px;">
        ${items
            .map(
                (item) =>
                    `<li><strong style="color:${accentColor};">${escapeHtml(item.formField)}</strong> → ${escapeHtml(item.storedAs)} — ${escapeHtml(item.description)}</li>`
            )
            .join("")}
      </ul>`
        : `<p style="margin:8px 0 0 0;color:#64748b;font-size:13px;">No file uploads required for this account type.</p>`;

const buildProfileList = (items) =>
    items.length
        ? `<ul style="margin:8px 0 0 0;padding-left:18px;color:#334155;font-size:13px;line-height:22px;">
        ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>`
        : "";

const buildRegistrationEmailHtml = (user) => {
    const role = String(user.role || "Guest").trim();
    const guide = getUploadGuide(role);
    const districtName = user.district?.name || "";
    const clubName = user.club?.name || user.clubName || "";
    const krsaId = user.krsaId || "—";
    const year = new Date().getFullYear();

    const detailRows = [
        buildDetailRow("Full Name", user.fullName),
        buildDetailRow("KRSA ID", krsaId),
        buildDetailRow("Role", role),
        buildDetailRow("Email", user.email),
        buildDetailRow("Phone", user.phone ? `+91 ${user.phone}` : ""),
        buildDetailRow("Gender", user.gender ? formatLabel(user.gender) : ""),
        buildDetailRow("Address", user.address),
        buildDetailRow("District", districtName),
        buildDetailRow("Club", clubName),
        buildDetailRow("Account Status", user.verify ? "Verified" : "Pending verification"),
    ]
        .filter(Boolean)
        .join("");

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Welcome to KRSA</title>
  </head>
  <body style="margin:0;padding:0;background:#eef1f6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f6;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(20,40,90,0.08);font-family:'Segoe UI',Arial,sans-serif;">
            <tr>
              <td style="background:linear-gradient(135deg,#1a3fb0,#3b82f6);padding:28px 32px;">
                <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;">KRSA</div>
                <div style="color:#dbe4ff;font-size:13px;margin-top:4px;">Karnataka Roller Skating Association</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 12px 32px;">
                <h1 style="margin:0 0 8px 0;color:#0f172a;font-size:20px;font-weight:700;">Welcome, ${escapeHtml(user.fullName || "Member")}!</h1>
                <p style="margin:0;color:#475569;font-size:14px;line-height:22px;">
                  Your KRSA account has been created successfully. Save your KRSA ID below — you will need it to log in.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:16px 32px 8px 32px;">
                <div style="display:inline-block;background:#f1f5ff;border:2px dashed #3b82f6;border-radius:12px;padding:16px 28px;">
                  <div style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Your KRSA ID</div>
                  <div style="color:#1a3fb0;font-size:28px;font-weight:800;letter-spacing:2px;">${escapeHtml(krsaId)}</div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 8px 32px;">
                <h2 style="margin:0 0 12px 0;color:#0f172a;font-size:15px;font-weight:700;">Registration Details</h2>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;">
                  ${detailRows}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 8px 32px;">
                <h2 style="margin:0 0 8px 0;color:#0f172a;font-size:15px;font-weight:700;">Next Steps — Complete Your Profile</h2>
                <p style="margin:0;color:#475569;font-size:13px;line-height:20px;">${escapeHtml(guide.summary)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px;">
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 16px;">
                  <div style="color:#166534;font-size:13px;font-weight:700;margin-bottom:4px;">Image Upload Fields</div>
                  ${buildUploadList(guide.imageUploads, "#166534")}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 32px;">
                <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 16px;">
                  <div style="color:#1e40af;font-size:13px;font-weight:700;margin-bottom:4px;">Document Upload Fields</div>
                  ${buildUploadList(guide.documentUploads, "#1e40af")}
                </div>
              </td>
            </tr>
            ${
                guide.profileFields.length
                    ? `<tr>
              <td style="padding:12px 32px 20px 32px;">
                <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:10px;padding:14px 16px;">
                  <div style="color:#6b21a8;font-size:13px;font-weight:700;margin-bottom:4px;">Additional Profile Fields</div>
                  ${buildProfileList(guide.profileFields)}
                </div>
              </td>
            </tr>`
                    : ""
            }
            <tr>
              <td style="padding:8px 32px 24px 32px;">
                <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:12px 16px;">
                  <p style="margin:0;color:#9a3412;font-size:12px;line-height:18px;">
                    Keep this email safe. Your KRSA ID, email, or phone can be used to log in. Never share your OTP with anyone.
                  </p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 32px;">
                <p style="margin:0;color:#94a3b8;font-size:12px;line-height:18px;">
                  Need help? Contact KRSA support.<br />
                  &copy; ${year} KRSA. All rights reserved.
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

const buildRegistrationEmailText = (user) => {
    const role = String(user.role || "Guest").trim();
    const guide = getUploadGuide(role);
    const districtName = user.district?.name || "";
    const clubName = user.club?.name || "";

    const imageLines = guide.imageUploads.map(
        (item) => `  - ${item.formField} → ${item.storedAs}: ${item.description}`
    );
    const docLines = guide.documentUploads.map(
        (item) => `  - ${item.formField} → ${item.storedAs}: ${item.description}`
    );

    return [
        `Welcome to KRSA, ${user.fullName || "Member"}!`,
        "",
        "Your account has been registered successfully.",
        "",
        `KRSA ID: ${user.krsaId || "—"}`,
        `Role: ${role}`,
        `Email: ${user.email || ""}`,
        `Phone: +91 ${user.phone || ""}`,
        user.address ? `Address: ${user.address}` : "",
        districtName ? `District: ${districtName}` : "",
        clubName ? `Club: ${clubName}` : "",
        "",
        "NEXT STEPS",
        guide.summary,
        "",
        imageLines.length ? "Image upload fields:\n" + imageLines.join("\n") : "",
        docLines.length ? "Document upload fields:\n" + docLines.join("\n") : "",
        "",
        "Keep your KRSA ID safe. You can log in using your KRSA ID, email, or phone.",
    ]
        .filter(Boolean)
        .join("\n");
};

export const sendRegistrationWelcomeEmail = async (user) => {
    const to = String(user?.email || "").trim().toLowerCase();
    if (!to) {
        return;
    }

    await getTransporter().sendMail({
        from: `"KRSA" <${process.env.EMAIL_USER}>`,
        to,
        subject: `Welcome to KRSA — Your ID is ${user.krsaId || "registered"}`,
        text: buildRegistrationEmailText(user),
        html: buildRegistrationEmailHtml(user),
    });
};
