import { getTransporter } from "./emailOtp.js";

const escapeHtml = (value) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

const buildOtpDigitBoxes = (otp, accentColor, bgColor, borderColor) =>
    String(otp)
        .split("")
        .map(
            (d) => `
          <td style="padding:0 5px;">
            <div style="width:52px;height:64px;line-height:64px;border-radius:12px;background:${bgColor};border:2px solid ${borderColor};color:${accentColor};font-size:28px;font-weight:800;text-align:center;font-family:'Courier New',monospace;">${escapeHtml(d)}</div>
          </td>`
        )
        .join("");

const buildEmailVerificationOtpHtml = (otp, email) => {
    const year = new Date().getFullYear();
    const maskedEmail = escapeHtml(email || "");
    const digitBoxes = buildOtpDigitBoxes(otp, "#0d9488", "#f0fdfa", "#5eead4");

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Verify Your Email — KRSA</title>
  </head>
  <body style="margin:0;padding:0;background:#eef1f6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f6;padding:36px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(20,40,90,0.10);font-family:'Segoe UI',Arial,sans-serif;">

            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#0f766e 0%,#14b8a6 100%);padding:32px 32px 28px 32px;text-align:center;">
                <div style="width:60px;height:60px;background:rgba(255,255,255,0.18);border-radius:50%;margin:0 auto 14px auto;line-height:60px;font-size:30px;">✉️</div>
                <div style="color:#ffffff;font-size:24px;font-weight:800;letter-spacing:1px;">KRSA</div>
                <div style="color:#ccfbf1;font-size:12px;margin-top:4px;letter-spacing:0.5px;">Karnataka Roller Skating Association</div>
              </td>
            </tr>

            <!-- Badge -->
            <tr>
              <td style="padding:28px 32px 0 32px;text-align:center;">
                <div style="display:inline-block;background:#f0fdfa;border:1px solid #5eead4;border-radius:50px;padding:8px 20px;">
                  <span style="color:#0f766e;font-size:13px;font-weight:700;">🔒 &nbsp;Email Verification</span>
                </div>
              </td>
            </tr>

            <!-- Message -->
            <tr>
              <td style="padding:20px 32px 8px 32px;text-align:center;">
                <h1 style="margin:0 0 10px 0;color:#0f172a;font-size:22px;font-weight:700;">Verify your email address</h1>
                <p style="margin:0;color:#64748b;font-size:14px;line-height:22px;">
                  You're one step away from joining KRSA.<br />
                  Enter the code below in the app to verify
                  ${maskedEmail ? `<strong style="color:#0f766e;">${maskedEmail}</strong>` : "your email"}.
                </p>
              </td>
            </tr>

            <!-- OTP boxes -->
            <tr>
              <td align="center" style="padding:24px 32px 8px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>${digitBoxes}</tr>
                </table>
              </td>
            </tr>

            <!-- Expiry -->
            <tr>
              <td align="center" style="padding:8px 32px 4px 32px;">
                <p style="margin:0;color:#94a3b8;font-size:13px;">
                  This verification code expires in
                  <strong style="color:#0f766e;">5 minutes</strong>
                </p>
              </td>
            </tr>

            <!-- Steps -->
            <tr>
              <td style="padding:20px 32px 8px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
                  <tr>
                    <td style="padding:16px 20px;">
                      <div style="color:#334155;font-size:13px;font-weight:700;margin-bottom:10px;">How to verify</div>
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td style="padding:6px 0;color:#64748b;font-size:13px;line-height:20px;">
                            <span style="display:inline-block;width:22px;height:22px;background:#ccfbf1;color:#0f766e;border-radius:50%;text-align:center;line-height:22px;font-size:12px;font-weight:700;margin-right:8px;">1</span>
                            Open the KRSA registration screen
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;color:#64748b;font-size:13px;line-height:20px;">
                            <span style="display:inline-block;width:22px;height:22px;background:#ccfbf1;color:#0f766e;border-radius:50%;text-align:center;line-height:22px;font-size:12px;font-weight:700;margin-right:8px;">2</span>
                            Enter the 4-digit code shown above
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;color:#64748b;font-size:13px;line-height:20px;">
                            <span style="display:inline-block;width:22px;height:22px;background:#ccfbf1;color:#0f766e;border-radius:50%;text-align:center;line-height:22px;font-size:12px;font-weight:700;margin-right:8px;">3</span>
                            Complete your registration
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Security warning -->
            <tr>
              <td style="padding:8px 32px 24px 32px;">
                <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px 18px;">
                  <p style="margin:0;color:#9a3412;font-size:12px;line-height:18px;">
                    <strong>Security tip:</strong> Never share this code with anyone. KRSA staff will never ask for your OTP via phone or message.
                  </p>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;">
                <p style="margin:0;color:#94a3b8;font-size:12px;line-height:20px;">
                  Didn't request this? You can safely ignore this email.<br />
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

const buildEmailVerificationOtpText = (otp, email) => [
    "KRSA — Email Verification",
    "",
    "Verify your email address to continue registration.",
    email ? `Email: ${email}` : "",
    "",
    `Your verification code: ${otp}`,
    "",
    "This code expires in 5 minutes.",
    "",
    "How to verify:",
    "1. Open the KRSA registration screen",
    "2. Enter the 4-digit code above",
    "3. Complete your registration",
    "",
    "Never share this code with anyone.",
    "",
    "Didn't request this? You can safely ignore this email.",
].filter(Boolean).join("\n");

export const sendEmailVerificationOTP = async (email, otp) => {
    const to = String(email?.email ?? email).trim().toLowerCase();
    if (!to) {
        throw new Error("Recipient email is required to send verification OTP");
    }

    await getTransporter().sendMail({
        from: `"KRSA" <${process.env.EMAIL_USER}>`,
        to,
        subject: `${otp} — Verify your email for KRSA registration`,
        text: buildEmailVerificationOtpText(otp, to),
        html: buildEmailVerificationOtpHtml(otp, to),
    });
};
