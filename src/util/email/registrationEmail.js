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
        <td style="padding:11px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">${escapeHtml(label)}</td>
        <td style="padding:11px 16px;color:#0f172a;font-size:14px;font-weight:600;border-bottom:1px solid #f1f5f9;text-align:right;">${escapeHtml(value)}</td>
      </tr>`;
};

const buildRegistrationEmailHtml = (user) => {
    const role = String(user.role || "Member").trim();
    const districtName = user.district?.name || "";
    const clubName = user.club?.name || "";
    const krsaId = user.krsaId || "—";
    const year = new Date().getFullYear();
    const firstName = escapeHtml((user.fullName || "Member").split(" ")[0]);

    const detailRows = [
        buildDetailRow("Full Name", user.fullName),
        buildDetailRow("Role", role),
        buildDetailRow("Email", user.email),
        buildDetailRow("Phone", user.phone ? `+91 ${user.phone}` : ""),
        buildDetailRow("District", districtName),
        buildDetailRow("Club", clubName),
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
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f6;padding:36px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(20,40,90,0.10);font-family:'Segoe UI',Arial,sans-serif;">

            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#1a3fb0 0%,#3b82f6 100%);padding:32px 32px 28px 32px;text-align:center;">
                <div style="width:56px;height:56px;background:rgba(255,255,255,0.15);border-radius:50%;margin:0 auto 14px auto;line-height:56px;font-size:28px;">🛼</div>
                <div style="color:#ffffff;font-size:24px;font-weight:800;letter-spacing:1px;">KRSA</div>
                <div style="color:#bfdbfe;font-size:12px;margin-top:4px;letter-spacing:0.5px;">Karnataka Roller Skating Association</div>
              </td>
            </tr>

            <!-- Success badge -->
            <tr>
              <td style="padding:32px 32px 0 32px;text-align:center;">
                <div style="display:inline-block;background:#f0fdf4;border:1px solid #86efac;border-radius:50px;padding:8px 20px;">
                  <span style="color:#16a34a;font-size:13px;font-weight:700;">✓ &nbsp;Registration Successful</span>
                </div>
              </td>
            </tr>

            <!-- Welcome message -->
            <tr>
              <td style="padding:20px 32px 8px 32px;text-align:center;">
                <h1 style="margin:0 0 10px 0;color:#0f172a;font-size:22px;font-weight:700;">Welcome, ${firstName}!</h1>
                <p style="margin:0;color:#64748b;font-size:14px;line-height:22px;">
                  Your account has been registered with KRSA.<br />
                  Your unique ID is ready — save it safely.
                </p>
              </td>
            </tr>

            <!-- KRSA ID card -->
            <tr>
              <td style="padding:20px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#eff6ff,#f0f9ff);border:2px solid #93c5fd;border-radius:14px;">
                  <tr>
                    <td style="padding:22px 24px;text-align:center;">
                      <div style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;font-weight:600;">Your KRSA ID</div>
                      <div style="color:#1a3fb0;font-size:32px;font-weight:900;letter-spacing:3px;font-family:'Courier New',monospace;">${escapeHtml(krsaId)}</div>
                      <div style="color:#94a3b8;font-size:12px;margin-top:8px;">Use this ID to log in to the KRSA app</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Details table -->
            <tr>
              <td style="padding:4px 32px 8px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                  ${detailRows}
                </table>
              </td>
            </tr>

            <!-- CTA hint -->
            <tr>
              <td style="padding:16px 32px 8px 32px;">
                <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px 18px;text-align:center;">
                  <p style="margin:0;color:#9a3412;font-size:13px;line-height:20px;">
                    🔐 Log in using your <strong>KRSA ID</strong>, <strong>email</strong>, or <strong>phone number</strong>.<br />
                    Never share your OTP with anyone.
                  </p>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;">
                <p style="margin:0;color:#94a3b8;font-size:12px;line-height:20px;">
                  Thank you for joining KRSA!<br />
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

const buildRegistrationEmailText = (user) => {
    const role = String(user.role || "Member").trim();
    const districtName = user.district?.name || "";
    const clubName = user.club?.name || "";

    return [
        `Welcome to KRSA, ${user.fullName || "Member"}!`,
        "",
        "✓ Your account has been registered successfully.",
        "",
        `Your KRSA ID: ${user.krsaId || "—"}`,
        "",
        `Role    : ${role}`,
        `Email   : ${user.email || ""}`,
        `Phone   : +91 ${user.phone || ""}`,
        districtName ? `District: ${districtName}` : "",
        clubName ? `Club    : ${clubName}` : "",
        "",
        "Log in using your KRSA ID, email, or phone number.",
        "Never share your OTP with anyone.",
        "",
        "Thank you for joining KRSA!",
    ]
        .filter(Boolean)
        .join("\n");
};

export const sendRegistrationWelcomeEmail = async (user) => {
    const to = String(user?.email || "").trim().toLowerCase();
    if (!to) {
        return false;
    }

    await getTransporter().sendMail({
        from: `"KRSA" <${process.env.EMAIL_USER}>`,
        to,
        subject: `Welcome to KRSA — Your ID ${user.krsaId || ""} is registered`,
        text: buildRegistrationEmailText(user),
        html: buildRegistrationEmailHtml(user),
    });

    return true;
};
